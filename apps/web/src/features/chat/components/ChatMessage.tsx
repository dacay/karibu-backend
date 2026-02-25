"use client";

import { ChatAgentAvatar } from "./ChatAgentAvatar";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
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
    <div className="flex items-end gap-2">
      {isAssistant && (
        <ChatAgentAvatar avatar={avatar} size="sm" isSpeaking={isSpeaking} />
      )}
      <Message from={message.role}>
        <MessageContent>
          <MessageResponse>{text}</MessageResponse>
        </MessageContent>
      </Message>
    </div>
  );
}
