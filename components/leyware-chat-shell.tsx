"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Image from "next/image";
import { GripVertical, Monitor, Music4, Send } from "lucide-react";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse
} from "@/components/ai-elements/message";
import { TextShimmerLoader } from "@/components/ui/loader";
import {
  isWorkbookSurface,
  type WorkbookSurface
} from "@/lib/workbook-surfaces";

type ChatTab = {
  id: string;
  title: string;
};

type MockMusic = {
  album: {
    title: string;
    artist: string;
    cover_url: string;
  };
  tracks: Array<{
    id: number;
    track_number: number;
    title: string;
    duration: string;
  }>;
};

type SurfaceTab = {
  id: string;
  title: string;
} & (
  | {
      kind: "mix_music";
      music: MockMusic;
    }
  | {
      kind: "workbook_surface";
      surface: WorkbookSurface;
    }
);

type LeywareChatShellProps = {
  isUnlocked?: boolean;
};

const MOCK_MUSIC: MockMusic = {
  album: {
    title: "Midnight Sessions",
    artist: "Leyware",
    cover_url: ""
  },
  tracks: [
    { id: 1, track_number: 1, title: "Opening Theme", duration: "3:24" },
    { id: 2, track_number: 2, title: "Level Up", duration: "2:48" },
    { id: 3, track_number: 3, title: "Boss Fight", duration: "4:12" },
    { id: 4, track_number: 4, title: "Victory Fanfare", duration: "1:55" },
    { id: 5, track_number: 5, title: "Credits Roll", duration: "5:03" }
  ]
};

const WELCOME_MESSAGE =
  "Welcome to Ryan's page. Here you can learn more about his diagnosis and treatment.";

const WELCOME_TITLE = "Ryan's page";
const WELCOME_EYEBROW = "Welcome";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isLargeScreenSplit() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(min-width: 1024px)").matches;
}

function PixelIcon({
  name,
  className = "",
  size = 16
}: {
  name: string;
  className?: string;
  size?: number | string;
}) {
  return (
    <i
      className={`hn hn-${name} ${className}`.trim()}
      style={{
        fontSize: typeof size === "number" ? `${size}px` : size,
        display: "inline-block",
        lineHeight: 1
      }}
    />
  );
}

function MusicPreview({ music }: { music: MockMusic }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted sm:h-20 sm:w-20">
          {music.album.cover_url ? (
            <Image
              src={music.album.cover_url}
              alt={music.album.title}
              width={80}
              height={80}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <Music4 className="h-8 w-8 text-muted-foreground" strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold sm:text-base">{music.album.title}</div>
          <div className="text-sm text-muted-foreground">{music.album.artist}</div>
          <div className="text-xs text-muted-foreground">{music.tracks.length} tracks</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {music.tracks.map((track, index) => (
          <div
            key={track.id}
            className={`flex items-start gap-3 px-3 py-3 text-sm sm:items-center sm:px-4 ${
              index === 0 ? "" : "border-t"
            }`}
          >
            <div className="w-6 flex-shrink-0 text-center text-xs text-muted-foreground">
              {track.track_number}
            </div>
            <div className="min-w-0 flex-1 leading-snug sm:truncate">{track.title}</div>
            <div className="flex-shrink-0 text-xs text-muted-foreground">{track.duration}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          What next?
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="w-full rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto sm:py-1.5"
          >
            Play something similar
          </button>
          <button
            type="button"
            className="w-full rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto sm:py-1.5"
          >
            More from this genre
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDocumentLabel(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function WorkbookSurfaceFrame({
  surface,
  children
}: {
  surface: WorkbookSurface;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 p-3 sm:p-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Surfaced document
            </div>
            <h3 className="mt-2 text-lg font-semibold leading-tight text-foreground sm:text-xl">
              {surface.documentName}
            </h3>
            <div className="mt-1 text-sm text-muted-foreground">
              {surface.documentOriginalName}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full border px-2.5 py-1">
              {surface.pageCount ? `${surface.pageCount} page${surface.pageCount === 1 ? "" : "s"}` : "Page count unknown"}
            </span>
            <span className="rounded-full border px-2.5 py-1">
              {formatDocumentLabel(surface.textSource)}
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-lg border bg-background px-3 py-2 text-[11px] text-muted-foreground">
          {surface.documentPath}
        </div>
      </div>

      {children}
    </div>
  );
}

function DocumentTextSurface({ surface }: { surface: WorkbookSurface & { surfaceType: "document_text" } }) {
  return (
    <WorkbookSurfaceFrame surface={surface}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Full extracted text
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
            {surface.extractedText?.trim() || "No extracted text is available for this document."}
          </div>
        </div>
      </div>
    </WorkbookSurfaceFrame>
  );
}

function SummarySurface({ surface }: { surface: WorkbookSurface & { surfaceType: "summary" } }) {
  return (
    <WorkbookSurfaceFrame surface={surface}>
      <div className="rounded-xl border bg-card p-5">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Summary
        </div>
        <div className="mt-3 text-base leading-7 text-foreground">{surface.summary}</div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {surface.bullets.map((bullet, index) => (
            <div key={`${surface.surfaceId}-bullet-${index}`} className="rounded-lg border bg-background px-4 py-3 text-sm leading-6 text-foreground">
              {bullet}
            </div>
          ))}
        </div>
      </div>
    </WorkbookSurfaceFrame>
  );
}

function KeyFactsSurface({ surface }: { surface: WorkbookSurface & { surfaceType: "key_facts" } }) {
  return (
    <WorkbookSurfaceFrame surface={surface}>
      <div className="grid gap-3 sm:grid-cols-2">
        {surface.facts.map((fact, index) => (
          <div key={`${surface.surfaceId}-fact-${index}`} className="rounded-xl border bg-card p-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {fact.label}
            </div>
            <div className="mt-3 text-base font-medium leading-6 text-foreground">{fact.value}</div>
            {fact.citation ? (
              <div className="mt-3 text-xs text-muted-foreground">{fact.citation}</div>
            ) : null}
          </div>
        ))}
      </div>
    </WorkbookSurfaceFrame>
  );
}

function SourceExcerptsSurface({
  surface
}: {
  surface: WorkbookSurface & { surfaceType: "source_excerpts" };
}) {
  return (
    <WorkbookSurfaceFrame surface={surface}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {surface.excerpts.map((excerpt, index) => (
          <div key={`${surface.surfaceId}-excerpt-${index}`} className="rounded-xl border bg-card p-4">
            <div className="border-l-2 border-primary/70 pl-4 text-sm leading-7 text-foreground">
              {excerpt.quote}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{excerpt.citation}</div>
          </div>
        ))}
      </div>
    </WorkbookSurfaceFrame>
  );
}

function TimelineSurface({ surface }: { surface: WorkbookSurface & { surfaceType: "timeline" } }) {
  return (
    <WorkbookSurfaceFrame surface={surface}>
      <div className="rounded-xl border bg-card p-5">
        <div className="space-y-4">
          {surface.events.map((event, index) => (
            <div key={`${surface.surfaceId}-event-${index}`} className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {event.date || `Event ${index + 1}`}
              </div>
              <div className="rounded-lg border bg-background px-4 py-3">
                <div className="text-sm font-medium text-foreground">{event.label}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{event.description}</div>
                {event.citation ? (
                  <div className="mt-3 text-xs text-muted-foreground">{event.citation}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkbookSurfaceFrame>
  );
}

function WorkbookSurfacePreview({ surface }: { surface: WorkbookSurface }) {
  if (surface.surfaceType === "document_text") {
    return <DocumentTextSurface surface={surface} />;
  }

  if (surface.surfaceType === "summary") {
    return <SummarySurface surface={surface} />;
  }

  if (surface.surfaceType === "key_facts") {
    return <KeyFactsSurface surface={surface} />;
  }

  if (surface.surfaceType === "source_excerpts") {
    return <SourceExcerptsSurface surface={surface} />;
  }

  return <TimelineSurface surface={surface} />;
}

function collectWorkbookSurfaces(message: UIMessage) {
  return message.parts.flatMap((part) => {
    if (!part.type.startsWith("tool-")) {
      return [];
    }

    if (!("state" in part) || part.state !== "output-available" || !("output" in part)) {
      return [];
    }

    return isWorkbookSurface(part.output) ? [part.output] : [];
  });
}

function ChatWelcomeHeader() {
  return (
    <div className="chat-welcome-header w-full border-b border-border/80 px-4 py-5 sm:px-5 sm:py-6">
      <div className="w-full max-w-2xl">
        <div className="chat-welcome-eyebrow text-[11px] font-medium uppercase tracking-[0.2em] text-primary/80">
          {WELCOME_EYEBROW}
        </div>
        <h2 className="chat-welcome-title mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2rem]">
          {WELCOME_TITLE}
        </h2>
        <div className="chat-welcome-copy mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
          <MessageResponse>{WELCOME_MESSAGE}</MessageResponse>
        </div>
      </div>
    </div>
  );
}

export function LeywareChatShell({ isUnlocked = false }: LeywareChatShellProps) {
  const [chatTabs, setChatTabs] = useState<ChatTab[]>([{ id: "chat-1", title: "Chat 1" }]);
  const [activeChatTabId, setActiveChatTabId] = useState("chat-1");
  const [surfaceTabs, setSurfaceTabs] = useState<SurfaceTab[]>([]);
  const [activeSurfaceTabId, setActiveSurfaceTabId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewingLoader, setIsPreviewingLoader] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    messages,
    sendMessage,
    status,
    error,
    clearError
  } = useChat({
    id: activeChatTabId,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: ({ message }) => {
      const surfacedSurfaces = collectWorkbookSurfaces(message);

      if (surfacedSurfaces.length === 0) {
        return;
      }

      setSurfaceTabs((currentTabs) => {
        const nextTabs = [...currentTabs];

        for (const surfacedSurface of surfacedSurfaces) {
          const nextTab: SurfaceTab = {
            id: surfacedSurface.surfaceId,
            title: surfacedSurface.title,
            kind: "workbook_surface",
            surface: surfacedSurface
          };
          const existingIndex = nextTabs.findIndex((tab) => tab.id === nextTab.id);

          if (existingIndex >= 0) {
            nextTabs[existingIndex] = nextTab;
          } else {
            nextTabs.push(nextTab);
          }
        }

        return nextTabs;
      });

      setActiveSurfaceTabId(surfacedSurfaces[surfacedSurfaces.length - 1]?.surfaceId ?? null);
    }
  });

  const activeSurfaceTab = surfaceTabs.find((tab) => tab.id === activeSurfaceTabId) ?? null;
  const isSubmitting = status === "submitted" || status === "streaming";

  const updateLeftWidth = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const position = clientX - rect.left;
    const size = rect.width;

    if (size <= 0) return;

    const nextWidth = (position / size) * 100;
    const clampedWidth = Math.min(Math.max(nextWidth, 25), 75);
    setLeftWidth(clampedWidth);
  };

  const resetPointerDrag = () => {
    dragPointerIdRef.current = null;
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const handleDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isLargeScreenSplit()) return;
    dragPointerIdRef.current = event.pointerId;
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
    updateLeftWidth(event.clientX);
  };

  const handleDividerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    updateLeftWidth(event.clientX);
  };

  const handleDividerPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetPointerDrag();
  };

  const handleDividerLostPointerCapture = () => {
    if (dragPointerIdRef.current !== null) {
      resetPointerDrag();
    }
  };

  const handleCloseChatTab = (tabId: string) => {
    if (chatTabs.length === 1) return;

    const tabIndex = chatTabs.findIndex((tab) => tab.id === tabId);
    const remainingTabs = chatTabs.filter((tab) => tab.id !== tabId);
    setChatTabs(remainingTabs);

    if (activeChatTabId === tabId) {
      const nextActiveTab = remainingTabs[Math.max(0, tabIndex - 1)] ?? remainingTabs[0];
      setActiveChatTabId(nextActiveTab.id);
    }
  };

  const handleComposerChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (error) {
      clearError();
    }

    setInput(event.target.value);
    event.target.style.height = "0px";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 200)}px`;
  };

  const handleComposerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextMessage = input.trim();
    if (!nextMessage || isSubmitting) {
      return;
    }

    setInput("");

    if (composerRef.current) {
      composerRef.current.style.height = "40px";
    }

    await sendMessage({ text: nextMessage });
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleOpenMusicPreview = () => {
    const nextTab: SurfaceTab = {
      id: createId("surface"),
      title: "mix_music",
      kind: "mix_music",
      music: MOCK_MUSIC
    };

    setSurfaceTabs((currentTabs) => [...currentTabs, nextTab]);
    setActiveSurfaceTabId(nextTab.id);
  };

  const handleCloseSurfaceTab = (tabId: string) => {
    const tabIndex = surfaceTabs.findIndex((tab) => tab.id === tabId);
    const remainingTabs = surfaceTabs.filter((tab) => tab.id !== tabId);
    setSurfaceTabs(remainingTabs);

    if (remainingTabs.length === 0) {
      setActiveSurfaceTabId(null);
      return;
    }

    if (activeSurfaceTabId === tabId) {
      const nextActiveTab = remainingTabs[Math.max(0, tabIndex - 1)] ?? remainingTabs[remainingTabs.length - 1];
      setActiveSurfaceTabId(nextActiveTab.id);
    }
  };

  const handleClearSurfaceTabs = () => {
    setSurfaceTabs([]);
    setActiveSurfaceTabId(null);
  };

  const handlePreviewLoader = () => {
    if (!isUnlocked || isSubmitting) {
      return;
    }

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    setIsPreviewingLoader(true);
    previewTimeoutRef.current = setTimeout(() => {
      setIsPreviewingLoader(false);
      previewTimeoutRef.current = null;
    }, 2200);
  };

  const renderMessageParts = (message: UIMessage) =>
    message.parts.flatMap((part, index) => {
      if (part.type !== "text" || part.text.trim().length === 0) {
        return [];
      }

      return [
        <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>
      ];
    });

  const lastMessage = messages[messages.length - 1];
  const lastAssistantHasText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some((part) => part.type === "text" && part.text.trim().length > 0);
  const shouldShowPendingMessage =
    isPreviewingLoader || status === "submitted" || (status === "streaming" && !lastAssistantHasText);

  return (
    <div className="min-h-svh">
      <div className="relative flex min-h-svh flex-1 overflow-hidden">
        <div className="relative flex flex-1 p-2 md:p-3">
          <div
            ref={containerRef}
            style={
              {
                "--panel-desktop": `${leftWidth}%`,
                "--surface-desktop": `${100 - leftWidth}%`
              } as CSSProperties
            }
            className={`workspace-split relative mx-auto w-full max-w-[1720px] gap-4 overflow-visible lg:h-full lg:min-h-0 lg:gap-0 lg:overflow-hidden ${
              isDragging ? "select-none" : ""
            }`}
          >
            <div className="workspace-primary min-h-[56svh] min-w-0 shrink-0 lg:min-h-0">
              <div className="flex h-full min-h-[56svh] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm lg:min-h-0">
                <div className="flex items-center gap-0.5 border-b px-1.5 pt-1.5 pb-0 sm:px-2">
                  <div className="scrollbar-hide flex flex-1 items-center gap-0.5 overflow-x-auto">
                    {chatTabs.map((tab) => {
                      const isActive = activeChatTabId === tab.id;

                      return (
                        <div
                          key={tab.id}
                          className={`group flex min-w-0 cursor-pointer items-center gap-1 rounded-t-lg px-3 py-1.5 transition-all ${
                            isActive
                              ? "border border-b-0 bg-background text-foreground shadow-sm"
                              : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                          onClick={() => setActiveChatTabId(tab.id)}
                          style={{
                            marginBottom: isActive ? "-1px" : "0",
                            borderBottom: isActive ? "1px solid var(--background)" : "1px solid transparent"
                          }}
                        >
                          <span className="whitespace-nowrap text-xs font-medium">{tab.title}</span>
                          {chatTabs.length > 1 ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCloseChatTab(tab.id);
                              }}
                              className="ml-1 rounded p-0.5 opacity-100 transition-opacity hover:bg-muted lg:opacity-0 lg:group-hover:opacity-100"
                              aria-label={`Close ${tab.title}`}
                            >
                              <PixelIcon name="times" className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handlePreviewLoader}
                    disabled={!isUnlocked || isSubmitting || isPreviewingLoader}
                    className="mb-1 inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isPreviewingLoader ? "Testing..." : "Test Shimmer"}
                  </button>
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-2.5 sm:p-3">
                  <div className="flex min-h-0 flex-1 overflow-hidden">
                    {isUnlocked ? (
                      <Conversation className="scrollbar-hide min-h-0 flex-1 overflow-auto">
                        <ConversationContent className="min-h-full gap-0 p-0">
                          {messages.length === 0 ? (
                            <div className="flex min-h-full flex-col">
                              <ChatWelcomeHeader />
                              {error ? (
                                <div className="px-4 py-4 sm:px-5">
                                  <div className="max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error.message}
                                  </div>
                                </div>
                              ) : null}
                              {shouldShowPendingMessage ? (
                                <div className="px-4 pb-4 sm:px-5">
                                  <Message from="assistant" className="max-w-2xl">
                                    <MessageContent className="rounded-2xl border bg-background px-4 py-3 text-foreground">
                                      <TextShimmerLoader
                                        text="Thinking"
                                        size="md"
                                        className="bg-[linear-gradient(to_right,var(--foreground)_30%,#1f9c96_44%,#6fd7cf_50%,#1f9c96_56%,var(--foreground)_70%)] motion-reduce:animate-none"
                                      />
                                    </MessageContent>
                                  </Message>
                                </div>
                              ) : null}
                              <div className="flex-1" />
                            </div>
                          ) : (
                            <div className="flex min-h-full flex-col">
                              <div className="flex flex-col gap-4 px-4 py-5 sm:px-5 sm:py-6">
                                {messages.map((message) => {
                                  const messageContent = renderMessageParts(message);

                                  if (messageContent.length === 0) {
                                    return null;
                                  }

                                  return (
                                    <Message
                                      key={message.id}
                                      from={message.role}
                                      className={message.role === "assistant" ? "max-w-2xl" : "max-w-[34rem]"}
                                    >
                                      <MessageContent>{messageContent}</MessageContent>
                                    </Message>
                                  );
                                })}

                                {shouldShowPendingMessage ? (
                                  <Message from="assistant" className="max-w-2xl">
                                    <MessageContent className="rounded-2xl border bg-background px-4 py-3 text-foreground">
                                      <TextShimmerLoader
                                        text="Thinking"
                                        size="md"
                                        className="bg-[linear-gradient(to_right,var(--foreground)_30%,#1f9c96_44%,#6fd7cf_50%,#1f9c96_56%,var(--foreground)_70%)] motion-reduce:animate-none"
                                      />
                                    </MessageContent>
                                  </Message>
                                ) : null}

                                {error ? (
                                  <Message from="assistant" className="max-w-2xl">
                                    <MessageContent className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                                      {error.message}
                                    </MessageContent>
                                  </Message>
                                ) : null}
                              </div>
                              <div className="flex-1" />
                            </div>
                          )}
                        </ConversationContent>
                        <ConversationScrollButton />
                      </Conversation>
                    ) : (
                      <div className="flex flex-1 items-center justify-center px-6 text-center">
                        <p className="text-sm text-muted-foreground">Ask anything to get started</p>
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={handleComposerSubmit}
                    className="shrink-0 rounded-lg border bg-background shadow-sm"
                  >
                    <div className="p-3">
                      <textarea
                        ref={composerRef}
                        rows={1}
                        value={input}
                        onChange={handleComposerChange}
                        onKeyDown={handleComposerKeyDown}
                        placeholder="What would you like to know?"
                        disabled={!isUnlocked || isSubmitting}
                        className="max-h-[200px] min-h-[40px] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </div>
                    <div className="flex px-3 pb-3 sm:hidden">
                      <button
                        type="submit"
                        disabled={!isUnlocked || isSubmitting || input.trim().length === 0}
                        className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                        aria-label="Send message"
                      >
                        <Send className="h-4 w-4" strokeWidth={2} />
                        <span>Send</span>
                      </button>
                    </div>
                    <div className="hidden items-center justify-end border-t px-3 py-2 sm:flex">
                      <button
                        type="submit"
                        disabled={!isUnlocked || isSubmitting || input.trim().length === 0}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                        aria-label="Send message"
                      >
                        <Send className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div
              className="group relative hidden h-full w-4 flex-shrink-0 cursor-col-resize items-center justify-center lg:flex"
              onPointerDown={handleDividerPointerDown}
              onPointerMove={handleDividerPointerMove}
              onPointerUp={handleDividerPointerUp}
              onPointerCancel={handleDividerPointerUp}
              onLostPointerCapture={handleDividerLostPointerCapture}
              role="separator"
              aria-label="Resize panels"
              aria-valuemin={25}
              aria-valuemax={75}
              aria-valuenow={Math.round(leftWidth)}
            >
              <div className="absolute left-1/2 top-2 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-border" />
              <div className="relative flex h-8 w-3 items-center justify-center rounded-sm bg-border opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="h-3 w-3 text-muted-foreground" strokeWidth={1.75} />
              </div>
            </div>

            <div className="workspace-secondary min-h-[40svh] min-w-0 shrink-0 lg:min-h-0">
              <div className="flex h-full min-h-[40svh] flex-col overflow-hidden rounded-xl border bg-white shadow-sm lg:min-h-0">
                <div className="flex-shrink-0 border-b bg-white">
                  <div className="flex items-center justify-between gap-2 px-2 pt-1.5 sm:px-3">
                    <div className="scrollbar-hide flex gap-1 overflow-x-auto">
                      {surfaceTabs.length > 0 ? (
                        surfaceTabs.map((tab) => {
                          const isActive = activeSurfaceTabId === tab.id;

                          return (
                            <div
                              key={tab.id}
                              className={`group flex items-center gap-1 whitespace-nowrap rounded-t-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                isActive
                                  ? "border border-b-0 bg-white text-foreground shadow-sm"
                                  : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                              style={{
                                marginBottom: isActive ? "-1px" : "0",
                                borderBottom: isActive ? "1px solid var(--background)" : "none"
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setActiveSurfaceTabId(tab.id)}
                                className="text-left"
                              >
                                {tab.title}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCloseSurfaceTab(tab.id)}
                                className="rounded p-0.5 opacity-100 transition-opacity hover:bg-muted lg:opacity-0 lg:group-hover:opacity-100"
                                aria-label={`Close ${tab.title}`}
                              >
                                <PixelIcon name="times" className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-3 py-1.5 text-xs text-muted-foreground">Surface</div>
                      )}
                    </div>

                    {surfaceTabs.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleClearSurfaceTabs}
                        className="mb-1 flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <PixelIcon name="times" className="h-3 w-3" />
                        Clear All
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden bg-white">
                  {activeSurfaceTab ? (
                    <div className="h-full overflow-auto">
                      {activeSurfaceTab.kind === "mix_music" ? (
                        <MusicPreview music={activeSurfaceTab.music} />
                      ) : (
                        <WorkbookSurfacePreview surface={activeSurfaceTab.surface} />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 sm:p-6">
                      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Monitor className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.75} />
                          <div className="text-sm font-medium text-muted-foreground">No app surfaced</div>
                          <div className="text-xs text-muted-foreground/70">
                            Apps will appear here when triggered by the chat
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-2">
                          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                            Test widgets
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenMusicPreview}
                            className="w-full rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            Music Player
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
