import type { IconProps } from "./IconProps";

/** Skap med to dører og en hengelås overlappende kanten. */
export function PhysicalAccessControlIcon({ className, size = 32 }: IconProps) {
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
      <rect x="4" y="3" width="18" height="26" rx="1.5" />
      <path d="M4 16h18" />
      <path d="M8 10v-0.01" strokeWidth={2.6} />
      <path d="M8 22v-0.01" strokeWidth={2.6} />
      <rect x="18" y="14" width="10" height="9" rx="1.5" />
      <path d="M20.5 14v-2.5a2.5 2.5 0 0 1 5 0V14" />
    </svg>
  );
}
