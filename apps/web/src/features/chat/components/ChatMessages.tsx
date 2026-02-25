"use client";

import { ChatMessage } from "./ChatMessage";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { UIMessage } from "ai";
import type { ChatAvatar } from "../types";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  avatar?: ChatAvatar;
  speakingMessageId?: string | null;
}

export function ChatMessages({
  messages,
  isLoading,
  avatar,
  speakingMessageId,
}: ChatMessagesProps) {
  return (
    <Conversation>
      <ConversationContent>
        {messages.length === 0 && !isLoading && (
          <p className="text-center text-sm text-muted-foreground">
            Start a conversation
          </p>
        )}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            avatar={avatar}
            isSpeaking={speakingMessageId === message.id}
          />
        ))}
        {isLoading && (
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
