"use client";

// Sets up TanStack Query (the library that fetches and re-fetches data)
// for every page. Pattern from the Next.js docs: a fresh client for each
// server render, and one shared client in the browser.

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/AuthProvider";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return new QueryClient();
  browserQueryClient ??= new QueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}
