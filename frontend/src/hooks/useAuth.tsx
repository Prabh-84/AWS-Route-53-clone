"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api-client";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  /** True until the initial GET /auth/me has resolved. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ME_KEY = ["auth", "me"] as const;

async function fetchMe(): Promise<User | null> {
  try {
    return await api.get<User>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: Infinity, retry: false });

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await api.post<User>("/auth/login", { email, password });
      queryClient.setQueryData(ME_KEY, user);
      return user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, null);
      router.replace("/signin");
    }
  }, [queryClient, router]);

  const value = useMemo(() => ({ user: data ?? null, isLoading, login, logout }), [data, isLoading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
