"use client";

import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";

import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { label: "My Learning", href: "#" },
  { label: "Progress", href: "#" },
];

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

export function LearnerRoot() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const initials = user?.email ? getInitials(user.email) : "?";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top nav */}
      <header className="flex h-16 items-center justify-between border-b px-6">
        <span className="text-lg font-semibold">Karibu</span>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">My Account</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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
        <h2 className="mb-4 text-xl font-semibold">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          {/* TODO: render learner sections here */}
          Your assigned learning sequences will appear here.
        </p>
      </main>
    </div>
  );
}
