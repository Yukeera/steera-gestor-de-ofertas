import { cn } from "@/lib/utils";

/**
 * Marca do Steera: uma esteira de três roletes com a peça em cima.
 * SVG inline para herdar `currentColor` e acompanhar o tema.
 */
export function LogoSteera({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      {/* a peça na esteira */}
      <rect
        x="10"
        y="6"
        width="12"
        height="8"
        rx="1.5"
        fill="currentColor"
        opacity="0.9"
      />
      {/* o trilho */}
      <path
        d="M3 20h26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* os roletes */}
      <circle cx="8" cy="25" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="25" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="25" r="3.5" stroke="currentColor" strokeWidth="2" />
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
