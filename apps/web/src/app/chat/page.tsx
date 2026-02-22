"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import { ChatInterface } from "@/features/chat";
import { CHAT_ENDPOINTS } from "@/features/chat";

export default function ChatPage() {

  const { user, isLoading } = useAuth();
  const router = useRouter();
  const chatId = useRef(crypto.randomUUID()).current;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen">
      <ChatInterface
        endpoint={CHAT_ENDPOINTS.assistant}
        chatId={chatId}
        autoPlayVoice={false}
      />
    </div>
  );
}
