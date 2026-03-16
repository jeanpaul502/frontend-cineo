import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white hover:bg-blue-500 shadow-sm",
        outline:
          "border border-white/25 text-white hover:bg-white/10 hover:border-white/35",
        ghost:
          "text-white hover:bg-white/10",
        secondary:
          "bg-gray-700 text-white hover:bg-gray-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  href?: string;
}

export const Button = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(({ className, variant, size, href, ...props }, ref) => {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (href) {
    return (
      <a href={href} className={classes} ref={ref as React.Ref<HTMLAnchorElement>}>
        {props.children}
      </a>
    );
  }

  return (
    <button className={classes} ref={ref as React.Ref<HTMLButtonElement>} {...props} />
  );
});
Button.displayName = "Button";

export { buttonVariants };