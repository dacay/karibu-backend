"use client";

import { useState } from "react";
import { Sparkles, Volume2, Loader2, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTTS } from "@/features/chat/hooks/useTTS";
import { getVersionedAssetUrl } from "@/lib/assets";
import { api, type Avatar as AvatarType } from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_OPTION = "default";

function avatarImageUrl(avatar: AvatarType): string | null {
  if (!avatar.imageS3Key) return null;
  return getVersionedAssetUrl(avatar.imageS3Key, avatar.updatedAt);
}

export function OnboardingModal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ["user", "me"],
    queryFn: api.user.me,
    enabled: !!user,
  });

  const { data: avatarsData } = useQuery({
    queryKey: ["avatars"],
    queryFn: api.avatars.list,
    enabled: !!user,
  });

  const profile = profileData?.user;
  const avatars = avatarsData?.avatars ?? [];

  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState<"welcome" | "avatar">("welcome");

  // Show only for learners who have never completed onboarding, until dismissed.
  const open =
    !dismissed &&
    !!profile &&
    profile.role === "user" &&
    profile.onboardingCompletedAt === null;

  const completeMutation = useMutation({
    mutationFn: api.user.completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });

  const preferenceMutation = useMutation({
    mutationFn: (preferredAvatarId: string | null) =>
      api.user.updatePreferences({ preferredAvatarId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });

  const { state: ttsState, speak, stop } = useTTS();
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Dismissal (skip, X, outside click, or finish) all mark onboarding as done so
  // it never reappears — onboarding is entirely optional.
  function dismiss() {
    stop();
    setDismissed(true);
    completeMutation.mutate();
  }

  function handlePreview(avatar: AvatarType) {
    if (previewingId === avatar.id && (ttsState === "loading" || ttsState === "playing")) {
      stop();
      setPreviewingId(null);
      return;
    }
    setPreviewingId(avatar.id);
    speak(`Hi, I'm ${avatar.name}. ${avatar.personality}`, avatar.voiceId).finally(() => {
      setPreviewingId((cur) => (cur === avatar.id ? null : cur));
    });
  }

  const selectedId = profile?.preferredAvatarId ?? DEFAULT_OPTION;

  function selectAvatar(value: string) {
    preferenceMutation.mutate(value === DEFAULT_OPTION ? null : value);
  }

  function isPreviewing(id: string) {
    return previewingId === id && (ttsState === "loading" || ttsState === "playing");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent className="max-w-lg">
        {step === "welcome" ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-7" />
            </div>
            <DialogHeader className="mb-2 items-center">
              <DialogTitle className="text-2xl">
                Welcome{profile?.firstName ? `, ${profile.firstName}` : ""}!
              </DialogTitle>
            </DialogHeader>
            <p className="max-w-sm text-sm text-muted-foreground">
              {user?.organizationName ? `${user.organizationName} uses ` : "We use "}
              Karibu to deliver short, focused learning sessions. You can pick the
              assistant voice and look that feels right for you — or keep the default.
              This is completely optional, and you can change it anytime from your account menu.
            </p>
            <div className="mt-6 flex w-full items-center justify-between gap-3">
              <Button variant="ghost" onClick={dismiss}>
                Skip
              </Button>
              <Button onClick={() => setStep("avatar")}>
                Choose your avatar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <DialogHeader>
              <DialogTitle>Choose your avatar</DialogTitle>
            </DialogHeader>
            <p className="-mt-2 mb-4 text-sm text-muted-foreground">
              Pick the assistant that will guide your sessions. Press play to hear
              each voice.
            </p>

            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {/* Default option */}
              <button
                type="button"
                onClick={() => selectAvatar(DEFAULT_OPTION)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  selectedId === DEFAULT_OPTION
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                <Avatar className="size-11">
                  <AvatarFallback>
                    <Sparkles className="size-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">Default</p>
                  <p className="text-xs text-muted-foreground">
                    Use the avatar chosen by your organization.
                  </p>
                </div>
                {selectedId === DEFAULT_OPTION && <Check className="size-4 text-primary" />}
              </button>

              {avatars.map((avatar) => {
                const img = avatarImageUrl(avatar);
                const active = selectedId === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => selectAvatar(avatar.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <Avatar className="size-11">
                      {img && <AvatarImage src={img} alt={avatar.name} />}
                      <AvatarFallback>{avatar.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{avatar.name}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {avatar.personality}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      title={`Preview ${avatar.name}'s voice`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(avatar);
                      }}
                    >
                      {isPreviewing(avatar.id) ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Volume2 className="size-4" />
                      )}
                    </Button>
                    {active && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => { stop(); setStep("welcome"); }}>
                Back
              </Button>
              <Button onClick={dismiss}>
                Get started
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
