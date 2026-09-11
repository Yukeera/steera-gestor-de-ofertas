import { exigirMembro, ehMestreOuChefe } from "@/lib/auth/sessao";
import {
  BarraLateral,
  NavegacaoMovel,
} from "@/components/navegacao/barra-lateral";
import { MenuUsuario } from "@/components/navegacao/menu-usuario";
import { assinarCaminho, BUCKET_AVATARES } from "@/lib/storage";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const membro = await exigirMembro();
  const podeVerRestrito = ehMestreOuChefe(membro);
  const fotoUrl = await assinarCaminho(BUCKET_AVATARES, membro.fotoPath);

  return (
    <div className="flex min-h-dvh">
      {/* `skip-links`: quem navega por teclado não deveria passar por 9 itens
          de menu antes de chegar no conteúdo. */}
      <a
        href="#conteudo"
        className="bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[1000] focus:rounded-md focus:px-4 focus:py-2 focus:ring-2"
      >
        Pular para o conteúdo
      </a>

      <BarraLateral podeVerRestrito={podeVerRestrito} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
          <NavegacaoMovel podeVerRestrito={podeVerRestrito} />
          <div className="flex-1" />
          <MenuUsuario membro={membro} fotoUrl={fotoUrl} />
        </header>

        <main id="conteudo" className="flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
