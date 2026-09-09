import type { IconProps } from "./IconProps";

/** Skjerm på fot med et skjold overlappende hjørnet — hindrer ukjent programvare i å kjøre. */
export function EndpointProtectionIcon({ className, size = 32 }: IconProps) {
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
      <rect x="3" y="5" width="19" height="13" rx="1.5" />
      <path d="M9 24h7" />
      <path d="M12.5 18v6" />
      <path d="M22 13l6-2.2 6 2.2v5c0 3.4-2.7 5.6-6 6.7-3.3-1.1-6-3.3-6-6.7z" />
    </svg>
  );
}
