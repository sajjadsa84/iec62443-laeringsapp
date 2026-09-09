import type { IconProps } from "./IconProps";

/** Serverboks med en nedlastingspil ned til et hakemerke — kontrollert distribusjon av oppdateringer. */
export function PatchServerIcon({ className, size = 32 }: IconProps) {
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
      <rect x="8" y="3" width="16" height="9" rx="1.5" />
      <path d="M11.5 7.5h9" />
      <path d="M16 15v7" />
      <path d="M12.5 19l3.5 3.5 3.5-3.5" />
      <circle cx="16" cy="27" r="4" />
      <path d="M14 27l1.5 1.5L19 25" strokeWidth={1.6} />
    </svg>
  );
}
