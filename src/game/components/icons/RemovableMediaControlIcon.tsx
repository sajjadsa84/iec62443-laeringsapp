import type { IconProps } from "./IconProps";

/** USB-minnepinne-silhuett med et forbudstegn (sirkel + skråstrek) over. */
export function RemovableMediaControlIcon({ className, size = 32 }: IconProps) {
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
      <rect x="12" y="3" width="8" height="6" rx="1" />
      <path d="M10 9h12l-1.8 15h-8.4z" />
      <circle cx="16" cy="19" r="10.5" />
      <path d="M8.5 26.5l15-15" />
    </svg>
  );
}
