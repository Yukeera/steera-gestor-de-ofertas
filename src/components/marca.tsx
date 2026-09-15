import { cn } from "@/lib/utils";

/**
 * Marca do Steera: o "S" desenhado como uma correia transportadora.
 *
 * A geometria é uma correia de verdade — dois roletes e a fita tangenciando
 * ambos —, por isso o traço é um caminho contínuo e não dois arcos colados:
 * emenda entre subpaths deixava uma costura de um pixel na cintura do S.
 *
 * A caixa é 70×100 (a arte encosta nas quatro bordas), então quem usa
 * dimensiona pela altura e deixa a largura em `auto`.
 */
export function LogoSteera({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 70 100"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-6 w-auto", className)}
    >
      {/* a correia: rabo tangente, volta do rolete de cima, cruzamento,
          volta do rolete de baixo, rabo tangente (simetria de 180°) */}
      <path
        d="M65.8 33.8 43.63 12.37A22.1 22.1 0 1 0 35.56 48.77L34.44 51.23A22.1 22.1 0 1 1 26.37 87.63L4.2 66.2"
        strokeWidth="11.8"
      />
      {/* os roletes. O furo é um pouco maior que o do desenho original para
          não fechar nos 16–24px da barra lateral e do favicon. */}
      <circle cx="28" cy="28" r="8.2" strokeWidth="6.4" />
      <circle cx="42" cy="72" r="8.2" strokeWidth="6.4" />
    </svg>
  );
}

export function MarcaSteera({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoSteera className="text-marca" />
      <span className="font-heading text-lg font-semibold tracking-tight">
        Steera
      </span>
    </span>
  );
}
