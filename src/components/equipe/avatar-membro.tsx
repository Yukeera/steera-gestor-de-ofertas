import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const TAMANHOS = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
  xl: "size-20 text-lg",
} as const;

export type TamanhoAvatar = keyof typeof TAMANHOS;

/** "Ana Paula Souza" → "AS". Uma letra só quando o nome é único. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
  return (
    partes[0].slice(0, 1) + partes[partes.length - 1].slice(0, 1)
  ).toUpperCase();
}

export function AvatarMembro({
  nome,
  fotoUrl,
  tamanho = "md",
  className,
  style,
}: {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: TamanhoAvatar;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Avatar className={cn(TAMANHOS[tamanho], className)} style={style}>
      {/* O alt fica vazio de propósito: quem consome já rotula o conjunto,
          e um alt aqui faria o leitor de tela repetir o nome duas vezes. */}
      <AvatarImage src={fotoUrl ?? undefined} alt="" />
      <AvatarFallback className="font-medium">{iniciais(nome)}</AvatarFallback>
    </Avatar>
  );
}
