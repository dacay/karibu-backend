export interface ChatAvatar {
  image?: string;
  voiceId?: string;
  name?: string;
}

export interface ChatConfig {
  endpoint: string;
  chatId: string;
  /** When set, sent in the request body so the backend can load ML context */
  microlearningId?: string;
  avatar?: ChatAvatar;
  autoPlayVoice?: boolean;
  className?: string;
  /** Called when the backend signals that the microlearning is completed */
  onComplete?: () => void;
}
