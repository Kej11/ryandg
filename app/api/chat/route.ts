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
import { assertAdminRequest, isAdminAuthError } from "@/lib/server/admin-auth";
import { type WorkbookSurface } from "@/lib/workbook-surfaces";

type ChatRequestBody = {
  messages?: UIMessage[];
};

const CHAT_SYSTEM_PROMPT = `You answer questions about Ryan's medical documents.

Rules:
- Always call search_documents first for every new user question.
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

export async function POST(request: Request) {
  try {
    await assertAdminRequest();
    assertAiGatewayConfigured();

    const body = (await request.json()) as ChatRequestBody;

    if (!Array.isArray(body.messages)) {
      return new Response("Expected a messages array.", { status: 400 });
    }

    const sanitizedMessages = sanitizeChatMessages(body.messages);

    const result = streamText({
      model: createGatewayModel(),
      system: CHAT_SYSTEM_PROMPT,
      messages: await convertToModelMessages(sanitizedMessages),
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
        if (stepNumber === 0) {
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
      stopWhen: stepCountIs(10),
      experimental_transform: smoothStream({
        delayInMs: 18,
        chunking: "word"
      })
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (isAdminAuthError(error)) {
      return new Response("Admin authentication is required.", {
        status: 401
      });
    }

    const message = error instanceof Error ? error.message : "Unable to process chat request.";

    return new Response(message, {
      status: 503
    });
  }
}
