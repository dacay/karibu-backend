"use client";

import { useRouter } from "next/navigation";
import { Sun, Moon, Monitor, ChevronDown, BookOpen, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { api, type MicrolearningWithDetails } from "@/lib/api";

const ASSETS_CDN_BASE = process.env.NEXT_PUBLIC_ASSETS_CDN_URL ?? "https://cdn.karibu.ai";

function getAvatarImageUrl(imageS3Key: string | null): string | null {
  return imageS3Key ? `${ASSETS_CDN_BASE}/${imageS3Key}` : null;
}

const APPEARANCE_OPTIONS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function getInitials(email: string): string {
  const [local] = email.split("@");
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function MicrolearningCard({ ml }: { ml: MicrolearningWithDetails }) {
  const router = useRouter();
  const isCompleted = ml.progress?.status === "completed";
  const avatarImageUrl = getAvatarImageUrl(ml.avatar?.imageS3Key ?? null);

  return (
    <button
      type="button"
      onClick={() => router.push(`/ml/${ml.id}`)}
      className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full"
    >
      <Avatar className="size-10 shrink-0">
        {avatarImageUrl && (
          <AvatarImage src={avatarImageUrl} alt={ml.avatar?.name ?? "Avatar"} />
        )}
        <AvatarFallback className="text-xs">
          {ml.avatar?.name?.slice(0, 2).toUpperCase() ?? "ML"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{ml.title}</p>
          {isCompleted && (
            <Badge variant="outline" className="gap-1 border-green-500 text-green-600 shrink-0">
              <CheckCircle2 className="size-3" />
              Completed
            </Badge>
          )}
        </div>
        {ml.topic && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{ml.topic.name}</p>
        )}
      </div>

      <div className="shrink-0 self-center">
        <BookOpen className="size-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function LearnerRoot() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const initials = user?.email ? getInitials(user.email) : "?";

  const { data: mlData, isLoading: mlLoading } = useQuery({
    queryKey: ["microlearnings", "my"],
    queryFn: api.microlearnings.myMicrolearnings,
    enabled: !!user,
  });

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

  const updatePreferenceMutation = useMutation({
    mutationFn: (preferredAvatarId: string | null) =>
      api.user.updatePreferences({ preferredAvatarId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });

  const microlearnings = mlData?.microlearnings ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top nav */}
      <header className="flex h-16 items-center justify-between border-b px-6">
        <span className="text-lg font-semibold">Karibu</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">My Account</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Avatar preference selector */}
            {avatarsData?.avatars && avatarsData.avatars.length > 0 && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <span>Chat Avatar</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="w-52">
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                        Override the default avatar
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={profileData?.user.preferredAvatarId ?? "default"}
                        onValueChange={(val) =>
                          updatePreferenceMutation.mutate(val === "default" ? null : val)
                        }
                      >
                        <DropdownMenuRadioItem value="default" className="cursor-pointer">
                          Use default
                        </DropdownMenuRadioItem>
                        {avatarsData.avatars.map((a) => (
                          <DropdownMenuRadioItem key={a.id} value={a.id} className="cursor-pointer">
                            {a.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
              Appearance
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
              {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value} className="cursor-pointer">
                  <Icon className="size-3.5 mr-2" />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={logout}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Page area */}
      <main className="flex-1 p-6">
        <h2 className="mb-1 text-xl font-semibold">My Learning</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Your assigned microlearning sessions
        </p>

        {mlLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-6" />
          </div>
        ) : microlearnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <BookOpen className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No microlearnings assigned</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your administrator will assign learning content here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl">
            {microlearnings.map((ml) => (
              <MicrolearningCard key={ml.id} ml={ml} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
