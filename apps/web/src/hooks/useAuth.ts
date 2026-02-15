"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type LoginResponse } from "@/lib/api";

const TOKEN_KEY = "karibu_token";
const USER_KEY = "karibu_user";

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
