"use client";

import { useCallback, useRef, useState } from "react";
import { TTS_ENDPOINT } from "../constants";

export type TTSState = "idle" | "loading" | "playing" | "error";

export interface UseTTSReturn {
  state: TTSState;
  isSpeaking: boolean;
  speak: (text: string, voiceId?: string) => Promise<void>;
  stop: () => void;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("karibu_token");
}

export function useTTS(): UseTTSReturn {

  const [state, setState] = useState<TTSState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  const speak = useCallback(async (text: string, voiceId?: string) => {

    stop();
    setState("loading");

    try {

      const token = getToken();

      const res = await fetch(TTS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!res.ok) {
        throw new Error(`TTS failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        cleanup();
        setState("idle");
      };

      audio.onerror = () => {
        cleanup();
        setState("error");
      };

      setState("playing");
      await audio.play();

    } catch {
      cleanup();
      setState("error");
    }

  }, [stop, cleanup]);

  return { state, isSpeaking: state === "playing", speak, stop };
}
