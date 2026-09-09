import type { IconProps } from "./IconProps";

/** Dokument med logglinjer og et forstørrelsesglass — samler og korrelerer hendelser. */
export function SiemIcon({ className, size = 32 }: IconProps) {
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
      <rect x="3" y="9" width="15" height="19" rx="1.5" />
      <path d="M6.5 14.5h8" />
      <path d="M6.5 18.5h8" />
      <path d="M6.5 22.5h5.5" />
      <circle cx="22" cy="12" r="5" />
      <path d="M25.7 15.7l3.3 3.3" strokeWidth={2.5} />
    </svg>
  );
}
