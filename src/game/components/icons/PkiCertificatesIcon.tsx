import type { IconProps } from "./IconProps";

/** Dokument med tekstlinjer og et seglmedaljong med bånd — kryptering og autentisering. */
export function PkiCertificatesIcon({ className, size = 32 }: IconProps) {
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
      <rect x="3" y="4" width="20" height="15" rx="1.5" />
      <path d="M6.5 8.5h11" />
      <path d="M6.5 12h9" />
      <path d="M6.5 15.5h6.5" />
      <circle cx="23" cy="21" r="5.5" />
      <path d="M20 25.5l-1.8 4.5 3-1.2 1.8 2.7 1.8-2.7 3 1.2-1.8-4.5" />
    </svg>
  );
}
