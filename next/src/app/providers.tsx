"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ensureAnonAuth } from "@/lib/firebase";
import { AppProvider } from "@/context/app-context";

export function Providers({ children }: { children: React.ReactNode }) {
  // Anonymous Firebase auth, client-side only (matches /app behaviour).
  React.useEffect(() => {
    ensureAnonAuth();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AppProvider>{children}</AppProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
