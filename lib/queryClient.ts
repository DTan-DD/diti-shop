// lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always new query client
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 60 * 1000 }, // 1 minute
      },
    });
  } else {
    // Browser: make sure to reuse the same client
    if (!browserQueryClient) {
      browserQueryClient = new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      });
    }
    return browserQueryClient;
  }
}
