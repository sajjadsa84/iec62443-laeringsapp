import type { IconProps } from "./IconProps";

/** ID-kort med bilde og tekstlinjer — sentral identitetshåndtering. */
export function AuthServerIcon({ className, size = 32 }: IconProps) {
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
      <rect x="3" y="8" width="26" height="16" rx="2" />
      <circle cx="10" cy="16" r="3.2" />
      <path d="M17 12h9" />
      <path d="M17 16h7" />
      <path d="M17 20h4" />
    </svg>
  );
}
