"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { ReactNode } from "react";

interface ReactQueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider
 * Wraps app with TanStack Query context
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
