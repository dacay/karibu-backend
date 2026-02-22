"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ChatAgentAvatar } from "./ChatAgentAvatar";
import { useTTS } from "../hooks/useTTS";
import { DEFAULT_AVATAR } from "../constants";
import type { ChatConfig } from "../types";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("karibu_token");
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

export function ChatInterface({
  endpoint,
  chatId,
  avatar,
  autoPlayVoice = false,
  className,
}: ChatConfig) {

  const resolvedAvatar = { ...DEFAULT_AVATAR, ...avatar };

  const { speak, stop, isSpeaking } = useTTS();
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: endpoint,
    id: chatId,
    body: { chatId },
    fetch: async (url, options) => {
      const token = getToken();
      return fetch(url, {
        ...options,
        headers: {
          ...(options?.headers as Record<string, string> | undefined),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
  });

  // Auto-speak the last assistant message when streaming finishes
  const prevIsLoadingRef = useRef(isLoading);

  useEffect(() => {

    const wasLoading = prevIsLoadingRef.current;
    prevIsLoadingRef.current = isLoading;

    if (!autoPlayVoice) return;
    if (!wasLoading || isLoading) return;

    const last = messages[messages.length - 1] as UIMessage | undefined;

    if (last?.role !== "assistant") return;

    const text = extractText(last);

    if (!text) return;

    setSpeakingMessageId(last.id);

    speak(text, resolvedAvatar.voiceId).finally(() => {
      setSpeakingMessageId(null);
    });

  }, [isLoading, messages, autoPlayVoice, speak, resolvedAvatar.voiceId]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    stop();
    setSpeakingMessageId(null);
    handleSubmit();
  }, [input, handleSubmit, stop]);

  const handleTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  }, [setInput]);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Header with avatar */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <ChatAgentAvatar
          avatar={resolvedAvatar}
          isSpeaking={isSpeaking}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {resolvedAvatar.name ?? "Assistant"}
          </p>
          {isSpeaking && (
            <p className="text-xs text-muted-foreground">Speaking...</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ChatMessages
        messages={messages as UIMessage[]}
        isLoading={isLoading}
        avatar={resolvedAvatar}
        speakingMessageId={speakingMessageId}
      />

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        onTranscript={handleTranscript}
        isLoading={isLoading}
      />
    </div>
  );
}
