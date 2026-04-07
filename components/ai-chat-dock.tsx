"use client";

import {
  useState,
  useRef,
  useEffect,
  FormEvent,
  KeyboardEvent,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  User,
  AlertCircle,
  ExternalLink,
  Upload,
  Eraser,
  Mic,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { postChat } from "@/lib/api";
import { getStoredChatPatientId } from "@/lib/chat-patient-id";
import { SugarCubesLogo } from "@/components/sugar-cubes-logo";

type ChatLine = {
  id: number;
  role: "assistant" | "user";
  text: string;
  variant?: "default" | "connection" | "report";
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type VoiceLang = "en" | "hi" | "kn";

const VOICE_LANGS: Record<
  VoiceLang,
  { label: string; stt: string; tts: string; translateName?: string }
> = {
  en: { label: "English", stt: "en-US", tts: "en-US" },
  hi: { label: "Hindi", stt: "hi-IN", tts: "hi-IN", translateName: "Hindi" },
  kn: { label: "Kannada", stt: "kn-IN", tts: "kn-IN", translateName: "Kannada" },
};

let lineId = 0;
function nextId() {
  lineId += 1;
  return lineId;
}

function isConnectionFailure(message: string): boolean {
  return (
    /HTML error page/i.test(message) ||
    /BACKEND_URL/i.test(message) ||
    /NEXT_PUBLIC_API_URL/i.test(message) ||
    /timed out or was unreachable/i.test(message) ||
    /Cannot reach API at/i.test(message)
  );
}

type ChatApiMessage = { role: "user" | "assistant"; content: string };
const QUICK_PROMPTS = [
  "What does my current hybrid score mean in simple words?",
  "How can I reduce low-glucose risk in the next 2 hours?",
  "Summarize my latest trend and what to watch next.",
] as const;

async function summarizeUploadedReport(reportText: string): Promise<string> {
  const body = {
    messages: [
      {
        role: "user",
        content:
          "Summarize this medical report in simple language. Use short sections: Key findings, What it may mean, Questions to ask doctor, and Red flags for urgent care. Do not diagnose.",
      } satisfies ChatApiMessage,
    ],
    reportText,
  };
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let parsed: { text?: string; error?: string } = {};
  try {
    parsed = JSON.parse(raw) as { text?: string; error?: string };
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    throw new Error(parsed.error || raw || "Failed to summarize uploaded report.");
  }
  return parsed.text?.trim() || "No summary was produced.";
}

async function extractReportText(file: File): Promise<string> {
  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Report is too large (max 2MB).");
  }
  const lower = file.name.toLowerCase();
  const supported =
    file.type.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json");
  if (!supported) {
    throw new Error(
      "Supported uploads: .txt, .md, .csv, .json. For PDF/image reports, paste key text first.",
    );
  }
  const text = (await file.text()).trim();
  if (!text) throw new Error("Uploaded report is empty.");
  return text.slice(0, 20000);
}

export function AiChatDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: nextId(),
      role: "assistant",
      text: "Ask about hypoglycemia risk, your latest saved reading, or what a score means. Patient ID comes from Log vitals (default P001).",
      variant: "default",
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatPatientLabel, setChatPatientLabel] = useState("P001");
  const [reportBusy, setReportBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("en");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setChatPatientLabel(getStoredChatPatientId());
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
      speechSynthesis?: SpeechSynthesis;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setVoiceSupported(Boolean(Ctor && w.speechSynthesis));
  }, []);

  async function translateForSpeech(text: string, lang: VoiceLang): Promise<string> {
    if (lang === "en") return text;
    const langName = VOICE_LANGS[lang].translateName ?? "English";
    const body = {
      messages: [
        {
          role: "user",
          content:
            `Translate the following text to ${langName}. Keep the meaning exact, simple, and concise. ` +
            `Return only translated text, no extra notes:\n\n${text}`,
        } satisfies ChatApiMessage,
      ],
    };
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return text;
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || text;
  }

  async function speakReply(text: string) {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const spoken = await translateForSpeech(text, voiceLang);
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.lang = VOICE_LANGS[voiceLang].tts;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    if (!overrideText) setInput("");
    const userLine: ChatLine = {
      id: nextId(),
      role: "user",
      text,
      variant: "default",
    };
    setLines((prev) => [...prev, userLine]);
    setSending(true);
    try {
      const pid =
        typeof window !== "undefined" ? getStoredChatPatientId() : "P001";
      const reply = await postChat(text, pid);
      void speakReply(reply);
      setLines((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: reply,
          variant: "default",
        },
      ]);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Could not reach the chat service.";
      const conn = isConnectionFailure(raw);
      setLines((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: conn
            ? "Could not reach the Sugarfree API (often on Vercel before BACKEND_URL is set)."
            : raw,
          variant: conn ? "connection" : "default",
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
  }, [input, sending, voiceEnabled, voiceLang]);

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

  function stopVoiceInput() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setVoiceBusy(false);
  }

  function startVoiceInput() {
    if (sending || reportBusy || voiceBusy || typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    try {
      const recognition = new Ctor();
      recognition.lang = VOICE_LANGS[voiceLang].stt;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const text = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
        if (!text) return;
        setInput("");
        void sendMessage(text);
      };
      recognition.onerror = () => {
        setLines((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: "Voice input had an issue. You can still type your message.",
            variant: "default",
          },
        ]);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setVoiceBusy(false);
      };
      recognitionRef.current = recognition;
      setVoiceBusy(true);
      recognition.start();
    } catch {
      setVoiceBusy(false);
    }
  }

  async function sendQuickPrompt(prompt: string) {
    if (sending) return;
    setInput("");
    void sendMessage(prompt);
  }

  async function onReportSelected(file: File | null) {
    if (!file || sending || reportBusy) return;
    setReportBusy(true);
    setLines((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "user",
        text: `Uploaded report: ${file.name}`,
        variant: "report",
      },
    ]);
    try {
      const text = await extractReportText(file);
      const summary = await summarizeUploadedReport(text);
      setLines((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: summary,
          variant: "default",
        },
      ]);
    } catch (e) {
      setLines((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text:
            e instanceof Error
              ? e.message
              : "Could not summarize uploaded report.",
          variant: "default",
        },
      ]);
    } finally {
      setReportBusy(false);
      if (reportInputRef.current) reportInputRef.current.value = "";
      queueMicrotask(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }

  return (
    <>
      {/* Launcher — matches nav CTA / accent strip */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group flex h-14 w-14 items-center justify-center border-2 border-foreground bg-foreground text-background shadow-[4px_4px_0_0_hsl(var(--foreground)/0.15)] transition hover:bg-background hover:text-foreground sm:h-16 sm:w-16"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close Sugarfree chat" : "Open Sugarfree chat"}
        >
          {isOpen ? (
            <X className="h-6 w-6" strokeWidth={1.5} />
          ) : (
            <span className="flex flex-col items-center gap-0.5">
              <SugarCubesLogo className="h-4 w-4 text-accent" />
              <Sparkles className="h-5 w-5" strokeWidth={1.5} />
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[5.5rem] right-4 z-50 flex h-[min(32rem,calc(100vh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden border-2 border-foreground/20 bg-background/95 shadow-2xl backdrop-blur-md sm:right-6 sm:w-[26rem]"
            role="dialog"
            aria-label="Sugarfree assistant chat"
          >
            {/* Header — navbar family */}
            <div className="shrink-0 border-b-2 border-foreground/15 bg-card/90 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <SugarCubesLogo className="h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
                      Sugarfree · Assistant
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Not medical advice
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block border border-foreground/25 bg-background px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {chatPatientLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages — dot grid like main pages */}
            <div
              ref={scrollRef}
              className="dot-grid-bg flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-4"
            >
              <div className="mb-1 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={sending || reportBusy}
                    onClick={() => void sendQuickPrompt(p)}
                    className="border border-foreground/20 bg-background/70 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-40"
                  >
                    {p.length > 44 ? `${p.slice(0, 44)}…` : p}
                  </button>
                ))}
              </div>
              {lines.map((line) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${line.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center border border-foreground/25 bg-card ${
                      line.role === "user" ? "" : "text-accent"
                    }`}
                  >
                    {line.role === "user" ? (
                      <User className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                  </div>
                  <div
                    className={`min-w-0 max-w-[88%] border-2 px-3 py-2 font-mono text-xs leading-relaxed ${
                      line.role === "user"
                        ? line.variant === "report"
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-foreground bg-foreground text-background"
                        : line.variant === "connection"
                          ? "border-destructive/40 bg-destructive/5 text-foreground"
                          : "border-foreground/15 bg-card text-foreground"
                    }`}
                  >
                    {line.variant === "connection" ? (
                      <ConnectionHelp text={line.text} />
                    ) : (
                      <p className="whitespace-pre-wrap wrap-break-word">{line.text}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              {sending && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-foreground/25 bg-card text-accent">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center gap-2 border-2 border-dashed border-foreground/20 bg-background/80 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            {/* Input — form-input family */}
            <form
              onSubmit={onSubmit}
              className="shrink-0 border-t-2 border-foreground/15 bg-card/95 p-3"
            >
              <div className="flex gap-2">
                <input
                  ref={reportInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.json,text/plain,text/csv,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void onReportSelected(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => reportInputRef.current?.click()}
                  disabled={sending || reportBusy}
                  className="shrink-0 border-2 border-foreground px-3 py-2 text-muted-foreground transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Upload report for summary"
                  title="Upload report (.txt/.csv/.json) for AI summary"
                >
                  {reportBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={() => (voiceBusy ? stopVoiceInput() : startVoiceInput())}
                    disabled={sending || reportBusy}
                    className="shrink-0 border-2 border-foreground px-3 py-2 text-muted-foreground transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={voiceBusy ? "Stop voice input" : "Start voice input"}
                    title={voiceBusy ? "Stop listening" : "Speak your message"}
                  >
                    {voiceBusy ? (
                      <Square className="h-4 w-4 text-red-500" strokeWidth={1.5} />
                    ) : (
                      <Mic className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={`Message — ${chatPatientLabel}`}
                  disabled={sending}
                  className="form-input min-w-0 flex-1 py-2.5 text-[13px] disabled:opacity-50"
                  autoComplete="off"
                  aria-label="Chat message"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="shrink-0 border-2 border-foreground bg-foreground px-4 py-2 text-background transition hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
                {voiceSupported && (
                  <select
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value as VoiceLang)}
                    className="shrink-0 border-2 border-foreground bg-background px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                    aria-label="Voice language"
                    title="Voice language"
                    disabled={sending || reportBusy || voiceBusy}
                  >
                    <option value="en">EN</option>
                    <option value="hi">HI</option>
                    <option value="kn">KN</option>
                  </select>
                )}
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={() => setVoiceEnabled((v) => !v)}
                    className={`shrink-0 border-2 px-3 py-2 transition ${
                      voiceEnabled
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground text-muted-foreground hover:bg-foreground hover:text-background"
                    }`}
                    aria-label={voiceEnabled ? "Disable voice replies" : "Enable voice replies"}
                    title={voiceEnabled ? "Voice replies enabled" : "Voice replies disabled"}
                  >
                    {voiceEnabled ? (
                      <Volume2 className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <VolumeX className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                )}
              </div>
              <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Sugarfree API + Gemini. Upload report (.txt/.csv/.json) for summary.
              </p>
              {voiceSupported && (
                <p className="mt-1 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground/80">
                  Voice mode: mic input + spoken replies in {VOICE_LANGS[voiceLang].label}. Default English.
                </p>
              )}
              <div className="mt-1 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setLines([
                      {
                        id: nextId(),
                        role: "assistant",
                        text: "Chat cleared. Ask about your latest reading, upload a report, or use a quick prompt.",
                        variant: "default",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 border border-foreground/20 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
                >
                  <Eraser className="h-3 w-3" />
                  Clear chat
                </button>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ConnectionHelp({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-foreground">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={1.5} />
        <p className="text-[11px] leading-snug">{text}</p>
      </div>
      <ol className="list-decimal space-y-1.5 pl-4 text-[10px] uppercase tracking-wide text-muted-foreground">
        <li className="normal-case tracking-normal">
          Deploy FastAPI (Railway / Render / Fly) with a public <strong className="text-foreground">HTTPS</strong> URL.
        </li>
        <li className="normal-case tracking-normal">
          Vercel → Environment Variables → set{" "}
          <code className="border border-foreground/20 bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
            BACKEND_URL
          </code>{" "}
          (no trailing slash).
        </li>
        <li className="normal-case tracking-normal">Redeploy the Next app.</li>
      </ol>
      <a
        href="https://vercel.com/docs/projects/environment-variables"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-accent underline-offset-4 hover:underline"
      >
        Vercel env docs
        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
      </a>
    </div>
  );
}
