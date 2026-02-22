"use client";

import { useCallback, type KeyboardEvent } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceInput } from "../hooks/useVoiceInput";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onTranscript: (text: string) => void;
  isLoading: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onTranscript,
  isLoading,
}: ChatInputProps) {

  const { state: voiceState, isSupported, startListening, stopListening } =
    useVoiceInput(onTranscript);

  const isListening = voiceState === "listening";

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <div className="shrink-0 border-t bg-background px-4 py-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? "Listening..."
              : "Message... (Enter to send, Shift+Enter for new line)"
          }
          rows={1}
          className="min-h-9 max-h-36 resize-none"
          disabled={isLoading}
        />
        {isSupported && (
          <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={handleMicClick}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          aria-label="Send message"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
