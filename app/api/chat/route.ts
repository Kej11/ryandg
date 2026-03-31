import {
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
  type UIMessage
} from "ai";
import { z } from "zod";
import {
  assertAiGatewayConfigured,
  createGatewayModel
} from "@/lib/ai/gateway";
import {
  readDocumentForChat,
  searchDocumentsForChat
} from "@/lib/server/documents/chat";
import { assertSiteRequest, isSiteAuthError } from "@/lib/server/site-auth";
import { type WorkbookSurface } from "@/lib/workbook-surfaces";

type ChatRequestBody = {
  messages?: UIMessage[];
};

const CONVERSATIONAL_SYSTEM_PROMPT = `You are the assistant for Ryan's page.

Rules:
- For greetings, thanks, acknowledgements, and generic capability questions, respond briefly and warmly.
- Do not claim to have searched, reviewed, or cited any medical records unless you actually used document tools in a tool-enabled turn.
- Keep these conversational replies short.
- If the user wants information from Ryan's records, ask them to ask a specific question about diagnosis, treatment, symptoms, medications, timelines, or uploaded documents.`;

const CHAT_SYSTEM_PROMPT = `You answer questions about Ryan's medical documents.

Rules:
- Only use document tools when the user is asking for information that should come from Ryan's records.
- Do not search, read, or render documents for greetings, thanks, pleasantries, generic help requests, or other conversational turns that do not require record evidence.
- Once you decide retrieval is needed, call search_documents first.
- After searching, call read_document for any document you intend to rely on before answering.
- After you have enough document context, call exactly one render tool before your final answer so the workbook displays the most useful view for the user.
- You may continue using tools until you can answer the question or determine the records do not contain the answer.
- Answer only from tool results. Do not guess, infer beyond the records, or fill in missing facts.
- If the records are insufficient, say that clearly.
- Pick the render tool that best matches the request:
  - render_summary_card: high-level overview
  - render_key_facts: direct factual lookup
  - render_source_excerpts: exact quoted evidence
  - render_timeline: chronology, treatment progression, sequence of events
  - render_document_text: when the user wants to inspect the original extracted text
- Cite supporting evidence inline using this format: [Document Name p.1] or [Document Name] if no page is available.`;

const documentRefSchema = z.object({
  documentId: z.string().trim().min(1),
  documentPath: z.string().trim().min(1),
  title: z.string().trim().min(1)
});

function hasSuccessfulReadDocumentStep(
  steps: Array<{
    toolResults: Array<{
      toolName: string;
      output: unknown;
    }>;
  }>
) {
  return steps.some((step) =>
    step.toolResults.some(
      (result) =>
        result.toolName === "read_document" &&
        Boolean(
          result.output &&
            typeof result.output === "object" &&
            "found" in result.output &&
            result.output.found === true
        )
    )
  );
}

function hasWorkbookSurfaceStep(
  steps: Array<{
    toolResults: Array<{
      toolName: string;
    }>;
  }>
) {
  return steps.some((step) =>
    step.toolResults.some((result) =>
      [
        "render_document_text",
        "render_summary_card",
        "render_key_facts",
        "render_source_excerpts",
        "render_timeline"
      ].includes(result.toolName)
    )
  );
}

async function loadWorkbookDocument(input: {
  documentId: string;
  documentPath: string;
}) {
  const document = await readDocumentForChat(input);

  if (!document) {
    return null;
  }

  return {
    documentId: document.documentId,
    documentName: document.documentName,
    documentOriginalName: document.documentOriginalName,
    documentPath: document.documentPath,
    pageCount: document.pageCount,
    textSource: document.textSource,
    extractedText: document.extractedText
  };
}

function withWorkbookBase<TSurfaceType extends WorkbookSurface["surfaceType"]>(
  surfaceType: TSurfaceType,
  title: string,
  document: NonNullable<Awaited<ReturnType<typeof loadWorkbookDocument>>>
) {
  return {
    surfaceId: `surface-${surfaceType}-${document.documentId}`,
    surfaceType,
    title,
    documentId: document.documentId,
    documentName: document.documentName,
    documentOriginalName: document.documentOriginalName,
    documentPath: document.documentPath,
    pageCount: document.pageCount,
    textSource: document.textSource
  };
}

function sanitizeChatMessages(messages: UIMessage[]) {
  return messages
    .map((message) => ({
      ...message,
      parts: message.parts.filter((part) => part.type === "text" && part.text.trim().length > 0)
    }))
    .filter((message) => message.parts.length > 0);
}

function getLatestUserText(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "user") {
      continue;
    }

    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function shouldSkipDocumentTools(input: string) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");

  if (!normalized) {
    return true;
  }

  if (
    /^(hi|hey|hello|yo|hiya|howdy|sup|what's up|whats up|good morning|good afternoon|good evening)[!.?]*$/.test(
      normalized
    )
  ) {
    return true;
  }

  if (/^(ok|okay|cool|nice|great|awesome|thanks|thank you|thx|got it|sounds good)[!.?]*$/.test(normalized)) {
    return true;
  }

  if (
    /^(how are you|who are you|what can you do|what can you help with|can you help me|help)[?.!]*$/.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /^(hi|hey|hello)[,!. ]+(how are you|what can you do|what can you help with|can you help me)[?.!]*$/.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    await assertSiteRequest();
    assertAiGatewayConfigured();

    const body = (await request.json()) as ChatRequestBody;

    if (!Array.isArray(body.messages)) {
      return new Response("Expected a messages array.", { status: 400 });
    }

    const sanitizedMessages = sanitizeChatMessages(body.messages);
    const latestUserText = getLatestUserText(sanitizedMessages);
    const shouldUseDocumentWorkflow = !shouldSkipDocumentTools(latestUserText);

    const sharedOptions = {
      model: createGatewayModel(),
      messages: await convertToModelMessages(sanitizedMessages),
      experimental_transform: smoothStream({
        delayInMs: 18,
        chunking: "word"
      })
    } as const;

    if (!shouldUseDocumentWorkflow) {
      const result = streamText({
        ...sharedOptions,
        system: CONVERSATIONAL_SYSTEM_PROMPT
      });

      return result.toUIMessageStreamResponse();
    }

    const result = streamText({
      ...sharedOptions,
      system: CHAT_SYSTEM_PROMPT,
      tools: {
        search_documents: tool({
          description:
            "Search the indexed medical document chunks to find the most relevant records for a question.",
          inputSchema: z.object({
            query: z.string().trim().min(1),
            maxHits: z.number().int().min(1).max(8).default(5)
          }),
          execute: async ({ query, maxHits }) => {
            const hits = await searchDocumentsForChat({
              query,
              limit: maxHits
            });

            return {
              query,
              hits,
              matchedDocuments: Array.from(
                new Map(
                  hits.map((hit) => [
                    hit.documentId,
                    {
                      documentId: hit.documentId,
                      documentName: hit.documentName,
                      documentOriginalName: hit.documentOriginalName,
                      documentPath: hit.documentPath
                    }
                  ])
                ).values()
              )
            };
          }
        }),
        read_document: tool({
          description:
            "Load the full extracted text for a specific indexed medical document after it has been identified as relevant.",
          inputSchema: z
            .object({
              documentId: z.string().trim().min(1).optional(),
              documentPath: z.string().trim().min(1).optional()
            })
            .refine(
              (input) => Boolean(input.documentId || input.documentPath),
              "Provide a documentId or documentPath."
            ),
          execute: async ({ documentId, documentPath }) => {
            const document = await readDocumentForChat({
              documentId,
              documentPath
            });

            if (!document) {
              return {
                found: false,
                message: "Document not found."
              };
            }

            return {
              found: true,
              documentId: document.documentId,
              documentName: document.documentName,
              documentOriginalName: document.documentOriginalName,
              documentPath: document.documentPath,
              status: document.status,
              textSource: document.textSource,
              pageCount: document.pageCount,
              indexingError: document.indexingError,
              extractedText: document.extractedText
            };
          }
        }),
        render_document_text: tool({
          description:
            "Render the full extracted document text in the workbook when the user wants to inspect the original record.",
          inputSchema: documentRefSchema,
          execute: async ({ documentId, documentPath, title }) => {
            const document = await loadWorkbookDocument({
              documentId,
              documentPath
            });

            if (!document) {
              return {
                success: false,
                message: "Document not found for workbook render."
              };
            }

            return {
              ...withWorkbookBase("document_text", title, document),
              extractedText: document.extractedText
            } satisfies WorkbookSurface;
          }
        }),
        render_summary_card: tool({
          description:
            "Render a concise summary card for the workbook after reading a document.",
          inputSchema: documentRefSchema.extend({
            summary: z.string().trim().min(1),
            bullets: z.array(z.string().trim().min(1)).min(1).max(5)
          }),
          execute: async ({ documentId, documentPath, title, summary, bullets }) => {
            const document = await loadWorkbookDocument({
              documentId,
              documentPath
            });

            if (!document) {
              return {
                success: false,
                message: "Document not found for workbook render."
              };
            }

            return {
              ...withWorkbookBase("summary", title, document),
              summary,
              bullets
            } satisfies WorkbookSurface;
          }
        }),
        render_key_facts: tool({
          description:
            "Render a structured key-facts panel in the workbook for direct factual answers.",
          inputSchema: documentRefSchema.extend({
            facts: z
              .array(
                z.object({
                  label: z.string().trim().min(1),
                  value: z.string().trim().min(1),
                  citation: z.string().trim().min(1).optional()
                })
              )
              .min(1)
              .max(8)
          }),
          execute: async ({ documentId, documentPath, title, facts }) => {
            const document = await loadWorkbookDocument({
              documentId,
              documentPath
            });

            if (!document) {
              return {
                success: false,
                message: "Document not found for workbook render."
              };
            }

            return {
              ...withWorkbookBase("key_facts", title, document),
              facts
            } satisfies WorkbookSurface;
          }
        }),
        render_source_excerpts: tool({
          description:
            "Render quoted source excerpts in the workbook when exact evidence matters.",
          inputSchema: documentRefSchema.extend({
            excerpts: z
              .array(
                z.object({
                  quote: z.string().trim().min(1),
                  citation: z.string().trim().min(1)
                })
              )
              .min(1)
              .max(6)
          }),
          execute: async ({ documentId, documentPath, title, excerpts }) => {
            const document = await loadWorkbookDocument({
              documentId,
              documentPath
            });

            if (!document) {
              return {
                success: false,
                message: "Document not found for workbook render."
              };
            }

            return {
              ...withWorkbookBase("source_excerpts", title, document),
              excerpts
            } satisfies WorkbookSurface;
          }
        }),
        render_timeline: tool({
          description:
            "Render a chronological timeline in the workbook for progression, treatment, or sequence questions.",
          inputSchema: documentRefSchema.extend({
            events: z
              .array(
                z.object({
                  label: z.string().trim().min(1),
                  date: z.string().trim().min(1).optional(),
                  description: z.string().trim().min(1),
                  citation: z.string().trim().min(1).optional()
                })
              )
              .min(1)
              .max(8)
          }),
          execute: async ({ documentId, documentPath, title, events }) => {
            const document = await loadWorkbookDocument({
              documentId,
              documentPath
            });

            if (!document) {
              return {
                success: false,
                message: "Document not found for workbook render."
              };
            }

            return {
              ...withWorkbookBase("timeline", title, document),
              events
            } satisfies WorkbookSurface;
          }
        })
      },
      prepareStep: async ({ stepNumber, steps }) => {
        if (stepNumber === 0 && shouldUseDocumentWorkflow) {
          return {
            activeTools: ["search_documents"],
            toolChoice: "required"
          };
        }

        const hasReadDocument = hasSuccessfulReadDocumentStep(steps);
        const hasWorkbookSurface = hasWorkbookSurfaceStep(steps);

        if (stepNumber >= 2 && hasReadDocument && !hasWorkbookSurface) {
          return {
            activeTools: [
              "render_document_text",
              "render_summary_card",
              "render_key_facts",
              "render_source_excerpts",
              "render_timeline"
            ],
            toolChoice: "required"
          };
        }

        return {
          activeTools: [
            "search_documents",
            "read_document",
            "render_document_text",
            "render_summary_card",
            "render_key_facts",
            "render_source_excerpts",
            "render_timeline"
          ],
          toolChoice: "auto"
        };
      },
      stopWhen: stepCountIs(10)
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (isSiteAuthError(error)) {
      return new Response("Site authentication is required.", {
        status: 401
      });
    }

    const message = error instanceof Error ? error.message : "Unable to process chat request.";

    return new Response(message, {
      status: 503
    });
  }
}
