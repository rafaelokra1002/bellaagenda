import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-cocoa text-white hover:bg-cocoa-soft shadow-soft",
  accent: "bg-[var(--accent)] text-white hover:opacity-90 shadow-soft",
  secondary: "bg-blush text-cocoa hover:bg-blush-deep",
  outline: "border border-line bg-white text-cocoa hover:bg-nude-soft",
  ghost: "text-cocoa hover:bg-nude-soft",
  danger: "bg-rose-700 text-white hover:bg-rose-800",
  whatsapp: "bg-[#1f8f4e] text-white hover:bg-[#187a41] shadow-soft",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-6 text-base gap-2",
  icon: "h-10 w-10",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
}

export function buttonClasses(variant: keyof typeof VARIANTS = "primary", size: keyof typeof SIZES = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-150 select-none",
    "disabled:pointer-events-none disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, size, className)} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
