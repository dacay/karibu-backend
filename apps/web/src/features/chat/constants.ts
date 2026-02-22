import type { ChatAvatar } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ElevenLabs "Rachel" — used when no voiceId is provided in the avatar config
export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export const DEFAULT_AVATAR: ChatAvatar = {
  voiceId: DEFAULT_VOICE_ID,
};

export const CHAT_ENDPOINTS = {
  ml: `${BASE_URL}/chat/ml`,
  assistant: `${BASE_URL}/chat/assistant`,
} as const;

export const TTS_ENDPOINT = `${BASE_URL}/chat/tts`;
