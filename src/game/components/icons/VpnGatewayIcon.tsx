import type { IconProps } from "./IconProps";

/** Tunnelåpning (konsentriske buer) med en hengelås foran — kryptert fjerntilgang. */
export function VpnGatewayIcon({ className, size = 32 }: IconProps) {
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
      <path d="M3 24a13 11 0 0 1 26 0" />
      <path d="M8 24a8 6.5 0 0 1 16 0" />
      <rect x="12" y="15" width="8" height="7" rx="1.5" />
      <path d="M14 15v-2a2 2 0 0 1 4 0v2" />
    </svg>
  );
}
