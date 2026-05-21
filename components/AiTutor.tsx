"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { FilterLayer } from "@/app/page";

// ---------- Shared types ----------

type HslChannel = { hue: number; saturation: number; luminance: number };
type HslState = {
  reds: HslChannel; oranges: HslChannel; yellows: HslChannel;
  greens: HslChannel; cyans: HslChannel; blues: HslChannel; magentas: HslChannel;
};

type Message = { role: "user" | "assistant"; content: string };

// ---------- Props ----------

type Props = {
  layers: FilterLayer[];
  hslAdjustments: HslState;
  // TODO: Replace with real subscription check when payments are implemented.
  isPremium?: boolean;
};

// ---------- Component ----------

export default function AiTutor({ layers, hslAdjustments, isPremium = true }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom whenever messages or streaming content change.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Focus input when drawer opens.
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // TODO: Replace isPremium check with real subscription data when payments are implemented.
  if (!isPremium) return null;

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setError(null);

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);
    setStreamingContent("");

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, layers, hslAdjustments }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string };
            if (parsed.error) {
              setError("Something went wrong. Please try again.");
              setIsLoading(false);
              setStreamingContent("");
              return;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamingContent(accumulated);
            }
          } catch {
            // Ignore malformed SSE lines.
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accumulated },
      ]);
      setStreamingContent("");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-accent-500 hover:bg-accent-400 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        <ChatBubbleIcon />
      </button>

      {/* Drawer */}
      {isOpen && (
        <div
          className="fixed bottom-[4.5rem] right-6 z-50 flex flex-col rounded-xl border border-ink-600 bg-ink-800 shadow-2xl"
          style={{ width: 380, height: 520 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-600 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-500" />
              <span className="text-sm font-semibold text-ink-100">AI Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Assistant"
              className="text-ink-300 hover:text-ink-100 transition-colors p-1 rounded"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.length === 0 && !isLoading && (
              <p className="text-xs text-ink-300 text-center mt-6 px-4 leading-relaxed">
                Ask me anything about the filters, layers, masks, or controls in this editor.
              </p>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {/* Streaming assistant message */}
            {isLoading && streamingContent && (
              <MessageBubble
                message={{ role: "assistant", content: streamingContent }}
                streaming
              />
            )}

            {/* Typing indicator (before first token arrives) */}
            {isLoading && !streamingContent && <TypingIndicator />}

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 text-center px-4">{error}</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-ink-600 px-3 py-2.5 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask a question…"
              disabled={isLoading}
              className="flex-1 resize-none bg-ink-700 border border-ink-500 rounded-lg text-sm text-ink-100 placeholder:text-ink-400 px-3 py-2 focus:outline-none focus:border-accent-500 transition-colors disabled:opacity-50"
              style={{ maxHeight: 96, lineHeight: "1.5" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="shrink-0 w-8 h-8 rounded-lg bg-accent-500 hover:bg-accent-400 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Sub-components ----------

function MessageBubble({
  message,
  streaming = false,
}: {
  message: Message;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed break-words",
          isUser
            ? "bg-accent-500 text-white rounded-br-sm whitespace-pre-wrap"
            : "bg-ink-700 text-ink-100 rounded-bl-sm",
          streaming ? "opacity-90" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => <code className="bg-ink-600 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
              h1: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
              h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
              h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {streaming && (
          <span className="inline-block w-1 h-3.5 ml-0.5 bg-current opacity-70 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-ink-700 rounded-xl rounded-bl-sm px-3 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
