"use client";

import { ChatAgentAvatar } from "./ChatAgentAvatar";
import type { ChatAvatar } from "../types";

interface TypingIndicatorProps {
  avatar?: ChatAvatar;
}

export function TypingIndicator({ avatar }: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2">
      <ChatAgentAvatar avatar={avatar} size="sm" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
