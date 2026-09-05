import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-[0.98]",
  secondary:
    "border border-border bg-white text-ink shadow-sm hover:bg-hover active:scale-[0.98]",
  danger:
    "border border-status-red text-status-red hover:bg-status-red-tint active:scale-[0.98]",
  ghost: "text-muted hover:bg-hover hover:text-ink",
};

export function buttonClasses(variant: ButtonVariant = "primary", extra = ""): string {
  return `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
