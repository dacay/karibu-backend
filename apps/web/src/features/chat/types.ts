export interface ChatAvatar {
  image?: string;
  voiceId?: string;
  name?: string;
}

export interface ChatConfig {
  endpoint: string;
  chatId: string;
  avatar?: ChatAvatar;
  autoPlayVoice?: boolean;
  className?: string;
}
