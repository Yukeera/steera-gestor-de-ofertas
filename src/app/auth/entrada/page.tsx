import { Suspense } from "react";
import type { Metadata } from "next";

import { MarcaSteera } from "@/components/marca";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ClienteEntrada } from "./cliente-entrada";

export const metadata: Metadata = { title: "Entrando" };

export default function PaginaEntrada() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <MarcaSteera className="justify-center" />
        <Card>
          <CardContent className="pt-6">
            <Suspense fallback={<Skeleton className="h-6 w-48" />}>
              <ClienteEntrada />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
