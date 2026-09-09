import type { IconProps } from "./IconProps";

/** To soner med et tomt mellomrom (DMZ-bufferet) imellom. */
export function IndustrialDmzIcon({ className, size = 32 }: IconProps) {
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
      <rect x="3" y="9" width="10" height="14" rx="1.5" />
      <rect x="19" y="9" width="10" height="14" rx="1.5" />
      <path d="M16 9v14" strokeDasharray="2.5 2.5" />
    </svg>
  );
}
