import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40";

  const primary =
    "bg-gradient-to-r from-accent-from to-accent-to text-background shadow-glowSm hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0";

  const secondary =
    "bg-panel text-text border border-accent-from/30 hover:border-accent-from hover:shadow-glowSm";

  return (
    <button
      className={`${base} ${variant === "primary" ? primary : secondary} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
