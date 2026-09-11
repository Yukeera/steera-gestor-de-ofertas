import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TemaProvider } from "@/components/tema-provider";

import "./globals.css";

// Pareamento "Dashboard Data" (docs/DESIGN.md §3): Fira Sans carrega a leitura,
// Fira Code carrega os dados. `display: swap` evita texto invisivel no carregamento.
const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Steera",
    template: "%s · Steera",
  },
  description:
    "Esteira de ofertas: da peneira de ideias à validação, com quem faz o quê em cada etapa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TemaProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </TemaProvider>
      </body>
    </html>
  );
}
