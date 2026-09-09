import type { IconProps } from "./IconProps";

/** Sperre etterfulgt av en heltrukket pil som kun peker én vei — envegs dataflyt. */
export function DataDiodeIcon({ className, size = 32 }: IconProps) {
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
      <path d="M6 8v16" strokeWidth={2.5} />
      <path d="M11 16h9" />
      <path d="M18 10l9 6-9 6z" fill="currentColor" stroke="none" />
    </svg>
  );
}
