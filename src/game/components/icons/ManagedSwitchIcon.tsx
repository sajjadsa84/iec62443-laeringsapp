import type { IconProps } from "./IconProps";

/** Boks med fire porter og kryssende linjer ned til separate segmenter. */
export function ManagedSwitchIcon({ className, size = 32 }: IconProps) {
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
      <rect x="4" y="6" width="24" height="10" rx="2" />
      <circle cx="9" cy="11" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="21" cy="11" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="27" cy="11" r="1.3" fill="currentColor" stroke="none" />
      <path d="M6 26l7-8" />
      <path d="M14 26L7 18" />
      <path d="M18 26l7-8" />
      <path d="M26 26l-7-8" />
    </svg>
  );
}
