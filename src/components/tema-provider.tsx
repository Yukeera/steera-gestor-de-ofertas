"use client";

import { ThemeProvider } from "next-themes";

/**
 * Tema claro/escuro. `defaultTheme: "system"` respeita a preferencia do sistema
 * operacional; a equipe roda quase sempre no escuro, mas essa e uma escolha de
 * cada pessoa, nao do app.
 */
export function TemaProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
