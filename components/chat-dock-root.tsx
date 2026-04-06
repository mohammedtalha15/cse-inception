"use client";

import dynamic from "next/dynamic";

const AiChatDock = dynamic(
  () => import("@/components/ai-chat-dock").then((m) => m.AiChatDock),
  { ssr: false, loading: () => null },
);

export function ChatDockRoot() {
  return <AiChatDock />;
}
