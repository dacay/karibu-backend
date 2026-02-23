"use client";

import { cn } from "@/lib/utils";
import { ChatAgentAvatar } from "./ChatAgentAvatar";
import type { UIMessage } from "ai";
import type { ChatAvatar } from "../types";

interface ChatMessageProps {
  message: UIMessage;
  avatar?: ChatAvatar;
  isSpeaking?: boolean;
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

export function ChatMessage({ message, avatar, isSpeaking = false }: ChatMessageProps) {

  const isAssistant = message.role === "assistant";
  const text = extractText(message);

  if (!text) return null;

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isAssistant ? "flex-row" : "flex-row-reverse"
      )}
    >
      {isAssistant && (
        <ChatAgentAvatar avatar={avatar} size="sm" isSpeaking={isSpeaking} />
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isAssistant
            ? "rounded-bl-sm bg-muted text-foreground"
            : "rounded-br-sm bg-primary text-primary-foreground"
        )}
      >
        {text}
      </div>
    </div>
  );
}
