"use client";

import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type LoginResponse } from "@/lib/api";
import { getCookie, deleteCookie } from "@/lib/utils/cookie";

const TOKEN_KEY = "karibu_token";
const USER_KEY = "karibu_user";
const PENDING_COOKIE = "karibu_pending_token";

function loadStoredAuth(): LoginResponse["user"] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse["user"]) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Bootstrap from pending cookie set by middleware after token-based login
  useEffect(() => {
    const raw = getCookie(PENDING_COOKIE);
    if (!raw) return;
    try {
      const { token, user } = JSON.parse(raw) as LoginResponse;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      deleteCookie(PENDING_COOKIE);
      queryClient.setQueryData(["auth", "user"], user);
    } catch {
      // Ignore malformed cookie
    }
  }, [queryClient]);

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: loadStoredAuth,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: api.auth.login,
    onSuccess: (data) => {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      queryClient.setQueryData(["auth", "user"], data.user);
    },
  });

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    queryClient.setQueryData(["auth", "user"], null);
  }, [queryClient]);

  return {
    user: user ?? null,
    isLoading,
    login: loginMutation.mutateAsync,
    logout,
  };
}
