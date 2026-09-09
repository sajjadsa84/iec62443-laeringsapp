import type { IconProps } from "./IconProps";

/** Murstein-mønster med en pil som stoppes rett foran — flytkontroll/segmentering. */
export function IndustrialFirewallIcon({ className, size = 32 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 16h10" />
      <path d="M9 12l4 4-4 4" />
      <path d="M17 7v18" strokeWidth={2.5} />
      <rect x="20" y="7" width="4" height="5" rx="0.5" />
      <rect x="25" y="7" width="4" height="5" rx="0.5" />
      <rect x="22.5" y="13" width="4" height="5" rx="0.5" />
      <rect x="20" y="19" width="4" height="5" rx="0.5" />
      <rect x="25" y="19" width="4" height="5" rx="0.5" />
    </svg>
  );
}
