"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceInputState = "idle" | "listening";

export interface UseVoiceInputReturn {
  state: VoiceInputState;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
}

// Augment window type for webkit-prefixed API
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export function useVoiceInput(
  onTranscript: (text: string) => void
): UseVoiceInputReturn {

  const [state, setState] = useState<VoiceInputState>("idle");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  useEffect(() => {

    if (!isSupported) return;

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("")
        .trim();

      if (transcript) {
        onTranscript(transcript);
      }

      setState("idle");
    };

    recognition.onerror = () => setState("idle");
    recognition.onend = () => setState("idle");

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };

  }, [isSupported, onTranscript]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || state !== "idle") return;
    setState("listening");
    recognitionRef.current.start();
  }, [state]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  return { state, isSupported, startListening, stopListening };
}
