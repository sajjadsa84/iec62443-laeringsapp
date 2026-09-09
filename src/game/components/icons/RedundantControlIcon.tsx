import type { IconProps } from "./IconProps";

/** To identiske bokser (primær/reserve) med bytte-piler imellom. */
export function RedundantControlIcon({ className, size = 32 }: IconProps) {
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
      <rect x="3" y="4" width="11" height="9" rx="1.5" />
      <rect x="3" y="19" width="11" height="9" rx="1.5" />
      <path d="M18 9h10" />
      <path d="M25 6l3 3-3 3" />
      <path d="M28 23H18" />
      <path d="M21 20l-3 3 3 3" />
    </svg>
  );
}
