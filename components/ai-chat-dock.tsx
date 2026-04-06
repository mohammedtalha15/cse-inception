"use client";

import {
  useState,
  useRef,
  useEffect,
  FormEvent,
  KeyboardEvent,
  useCallback,
} from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { postChat } from "@/lib/api";

type ChatLine = { id: number; role: "sys" | "user"; text: string };

let lineId = 0;
function nextId() {
  lineId += 1;
  return lineId;
}

export function AiChatDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: nextId(),
      role: "sys",
      text: "Ask about hypoglycemia risk, your latest reading context, or what a score means. Replies use your most recent saved reading for this patient ID (default P001).",
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatPatientLabel, setChatPatientLabel] = useState("P001");

  useEffect(() => {
    if (!isOpen) return;
    setChatPatientLabel(localStorage.getItem("ayuq_chat_patient_id") ?? "P001");
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const userLine: ChatLine = { id: nextId(), role: "user", text };
    setLines((prev) => [...prev, userLine]);
    setSending(true);
    try {
      const pid =
        typeof window !== "undefined"
          ? (localStorage.getItem("ayuq_chat_patient_id") ?? "P001")
          : "P001";
      const reply = await postChat(text, pid);
      setLines((prev) => [
        ...prev,
        { id: nextId(), role: "sys", text: reply },
      ]);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not reach the chat service.";
      setLines((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "sys",
          text: `Something went wrong: ${msg}. Check that the API is running and redeployed with the latest backend (POST /chat).`,
        },
      ]);
    } finally {
      setSending(false);
      queueMicrotask(() => {
        inputRef.current?.focus();
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [input, sending]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center border border-neutral-700 bg-neutral-900 p-3 text-neutral-100 shadow-2xl transition-colors hover:bg-neutral-800 sm:p-4"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close Ayuq chat" : "Open Ayuq chat"}
        >
          {isOpen ? (
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed bottom-24 right-6 z-50 flex h-[500px] max-h-[calc(100vh-8rem)] w-[calc(100vw-3rem)] flex-col border border-neutral-800 bg-neutral-950 shadow-2xl sm:w-96"
          role="dialog"
          aria-label="Ayuq explainable AI chat"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 p-3 font-mono text-xs uppercase tracking-widest text-neutral-400">
            <span>Ayuq assistant</span>
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto p-4 font-mono text-sm text-neutral-300"
          >
            {lines.map((line) => (
              <div
                key={line.id}
                className={
                  line.role === "sys"
                    ? "border-l-2 border-green-500 bg-neutral-900 p-3"
                    : "border-l-2 border-neutral-600 bg-neutral-900/80 p-3"
                }
              >
                {line.role === "sys" && (
                  <span className="mr-2 font-bold tracking-wider text-green-500">SYS{">"}</span>
                )}
                {line.role === "user" && (
                  <span className="mr-2 font-bold tracking-wider text-neutral-400">YOU{">"}</span>
                )}
                {line.text}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 border-l-2 border-green-500/50 bg-neutral-900/50 p-3 font-mono text-xs text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            className="flex gap-2 border-t border-neutral-800 bg-neutral-900 p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Ask (patient ${chatPatientLabel})…`}
              disabled={sending}
              className="min-w-0 flex-1 border border-neutral-700 bg-neutral-950 p-3 font-mono text-sm text-white placeholder:text-neutral-600 focus:border-green-500/50 focus:outline-none disabled:opacity-50"
              autoComplete="off"
              aria-label="Chat message"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex shrink-0 items-center justify-center border border-neutral-600 bg-neutral-800 px-3 text-neutral-100 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
