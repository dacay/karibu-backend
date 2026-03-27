"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bot,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
  api,
  type ChatTranscriptMessage,
} from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProgressStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-100 border-0">
          <CheckCircle2 className="size-3" />
          Completed
        </Badge>
      );
    case "active":
      return (
        <Badge className="gap-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
          <Clock className="size-3" />
          Active
        </Badge>
      );
    case "expired":
      return (
        <Badge className="gap-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 border-0">
          <AlertCircle className="size-3" />
          Expired
        </Badge>
      );
    default:
      return null;
  }
}

function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p: { type?: string }) => p.type === "text")
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ items }: {
  items: Array<{ label: string; onClick?: () => void }>;
}) {
  const lastClickable = [...items].reverse().find(item => item.onClick);

  return (
    <nav className="flex items-center gap-2 text-sm">
      {lastClickable && (
        <button
          onClick={lastClickable.onClick}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
      )}
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/40" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ─── Chat Transcript Viewer ──────────────────────────────────────────────────

function ChatTranscriptViewer({ userId, chatId, chatLabel, email }: {
  userId: string;
  chatId: string;
  chatLabel: string;
  email: string;
}) {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["adminLearners", userId, "chats", chatId],
    queryFn: () => api.adminLearners.chatTranscript(userId, chatId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  const messages = data?.messages ?? [];
  const visibleMessages = messages.filter((msg) => {
    if (msg.role === "system") return false;
    const text = extractTextFromParts(msg.parts);
    if (msg.role === "user" && text === "__start__") return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Breadcrumb items={[
        { label: "Members", onClick: () => router.push("/team") },
        { label: email, onClick: () => router.push(`/team?member=${userId}`) },
        { label: chatLabel },
      ]} />

      {visibleMessages.length === 0 ? (
        <Card className="py-8 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
        </Card>
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="p-6 space-y-3">
            {visibleMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatTranscriptMessage }) {
  const isUser = message.role === "user";
  const text = extractTextFromParts(message.parts);

  if (!text.trim()) return null;

  return (
    <div className={["flex gap-3", isUser ? "flex-row-reverse" : ""].join(" ")}>
      <div className={[
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted",
      ].join(" ")}>
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className={[
        "max-w-[75%] rounded-lg px-4 py-2.5",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted",
      ].join(" ")}>
        <p className="text-sm whitespace-pre-wrap">{text}</p>
        <p className={[
          "text-[10px] mt-1",
          isUser ? "text-primary-foreground/60" : "text-muted-foreground",
        ].join(" ")}>
          {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ─── Main Learner Detail View ────────────────────────────────────────────────

interface LearnerDetailViewProps {
  userId: string;
  email: string;
}

export function LearnerDetailView({ userId, email }: LearnerDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chat");

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["adminLearners", userId, "history"],
    queryFn: () => api.adminLearners.history(userId),
  });

  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ["adminLearners", userId, "chats"],
    queryFn: () => api.adminLearners.chats(userId),
  });

  // Resolve chat label from cached chats data
  const chatSessions = chatsData?.chats ?? [];
  const selectedChat = chatId ? chatSessions.find((c) => c.id === chatId) : null;
  const chatLabel = selectedChat
    ? (selectedChat.type === "microlearning"
      ? (selectedChat.microlearningTitle ?? "ML Session")
      : "Ask Me Anything")
    : "";

  if (chatId) {
    return (
      <ChatTranscriptViewer
        userId={userId}
        chatId={chatId}
        chatLabel={chatLabel}
        email={email}
      />
    );
  }

  const history = historyData?.history ?? [];
  const mlChats = chatSessions.filter((c) => c.type === "microlearning");
  const discussionChats = chatSessions.filter((c) => c.type === "discussion");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: "Members", onClick: () => router.push("/team") },
        { label: email },
      ]} />

      {/* Learning History */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Learning History</p>

        {historyLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-4 text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <Card className="py-6 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No microlearning activity yet.</p>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground px-5 py-2.5 w-full">Microlearning</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap">Status</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, i) => (
                    <tr key={item.id} className={["hover:bg-muted/30 transition-colors", i < history.length - 1 ? "border-b" : ""].join(" ")}>
                      <td className="px-5 py-2.5 font-medium">{item.title}</td>
                      <td className="px-4 py-2.5"><ProgressStatusBadge status={item.status} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        {item.completedAt
                          ? formatDate(item.completedAt)
                          : item.expiredAt
                          ? formatDate(item.expiredAt)
                          : formatDate(item.openedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Chat Transcripts */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chat Transcripts</p>

        {chatsLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-4 text-muted-foreground" />
          </div>
        ) : chatSessions.length === 0 ? (
          <Card className="py-6 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No chat sessions yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {mlChats.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Microlearning sessions</p>
                <Card>
                  <CardContent className="p-0">
                    {mlChats.map((chat, i) => (
                      <button
                        key={chat.id}
                        type="button"
                        className={[
                          "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer",
                          i < mlChats.length - 1 ? "border-b" : "",
                        ].join(" ")}
                        onClick={() => router.push(`/team?member=${userId}&chat=${chat.id}`)}
                      >
                        <BookOpen className="size-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{chat.microlearningTitle ?? "Untitled ML"}</p>
                          <p className="text-xs text-muted-foreground">
                            {chat.messageCount} messages &middot; {formatDate(chat.updatedAt)}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {discussionChats.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Assistant conversations</p>
                <Card>
                  <CardContent className="p-0">
                    {discussionChats.map((chat, i) => (
                      <button
                        key={chat.id}
                        type="button"
                        className={[
                          "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer",
                          i < discussionChats.length - 1 ? "border-b" : "",
                        ].join(" ")}
                        onClick={() => router.push(`/team?member=${userId}&chat=${chat.id}`)}
                      >
                        <MessageSquare className="size-4 text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Ask Me Anything</p>
                          <p className="text-xs text-muted-foreground">
                            {chat.messageCount} messages &middot; {formatDate(chat.updatedAt)}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
