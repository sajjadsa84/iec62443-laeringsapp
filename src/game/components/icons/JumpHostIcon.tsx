import type { IconProps } from "./IconProps";

/** Portal/dør-form med en person-silhuett — eneste inngangspunkt for administrativ tilgang. */
export function JumpHostIcon({ className, size = 32 }: IconProps) {
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
      <path d="M8 28V14a8 8 0 0 1 16 0v14" />
      <path d="M4 28h24" />
      <circle cx="16" cy="16" r="2.6" fill="currentColor" stroke="none" />
      <path d="M11.5 25.5v-2.3a4.5 4.5 0 0 1 9 0v2.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
