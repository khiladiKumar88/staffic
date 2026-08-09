import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "border border-border bg-white text-ink hover:bg-hover",
  danger: "border border-status-red text-status-red hover:bg-status-red-tint",
  ghost: "text-muted hover:bg-hover hover:text-ink",
};

/** Class-string builder — use directly when you need the styling without the component (e.g. on an <a>). */
export function buttonClasses(variant: ButtonVariant = "primary", extra = ""): string {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${extra}`;
}

/**
 * Plain <button>, no client-side state of its own — safe to use inside
 * both Server Component forms (`<form action={...}><Button>Approve</Button></form>`)
 * and client forms (`useActionState`).
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
