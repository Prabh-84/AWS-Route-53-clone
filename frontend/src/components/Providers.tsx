"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { useApplyColorMode } from "@/hooks/useColorMode";
import { ApiError } from "@/lib/api-client";

function ColorModeSync() {
  useApplyColorMode();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't retry client errors (401/404/...): they will not succeed on a second try.
            retry: (count, error) => !(error instanceof ApiError && error.status < 500 && error.status !== 0) && count < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeSync />
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
