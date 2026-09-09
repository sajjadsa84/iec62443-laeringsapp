import type { IconProps } from "./IconProps";

/** Øye med pupill og radar-bølger — overvåker trafikk og varsler om mistenkelig aktivitet. */
export function IdsIpsIcon({ className, size = 32 }: IconProps) {
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
      <path d="M3 17s4.5-8 13-8 13 8 13 8-4.5 8-13 8-13-8-13-8z" />
      <circle cx="16" cy="17" r="3.6" />
      <circle cx="16" cy="17" r="1" fill="currentColor" stroke="none" />
      <path d="M23 10a12 12 0 0 1 0 14" strokeDasharray="1.5 3" />
    </svg>
  );
}
