/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";

let client: QueryClient | null = null;

function getQueryClient() {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return client;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const qc = useMemo(() => getQueryClient(), []);
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

export { getQueryClient };
