"use client";

import * as React from "react";
import type { Session } from "next-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";

type AppProvidersProps = {
  children: React.ReactNode;
  session: Session | null;
};

export function AppProviders({ children, session }: AppProvidersProps) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <AuthProvider session={session}>
      <ThemeProvider>
        <NuqsAdapter>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </AuthProvider>
  );
}

