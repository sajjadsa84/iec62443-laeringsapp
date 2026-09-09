import type { IconProps } from "./IconProps";

/** Database-sylinder med en sirkulær gjenopprettingspil overlappende hjørnet. */
export function BackupRecoveryIcon({ className, size = 32 }: IconProps) {
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
      <ellipse cx="14" cy="8" rx="9" ry="3.2" />
      <path d="M5 8v13c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2V8" />
      <path d="M5 14.5c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2" />
      <path d="M28 22a7 7 0 1 1-1.8-8" strokeWidth={1.8} />
      <path d="M27 11.5l1 3-3 .5" strokeWidth={1.8} />
    </svg>
  );
}
