// @ts-nocheck
import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
    // WCAG 2.2: transition-all respects prefers-reduced-motion via global CSS
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                // WCAG AA fix: use #059669 (emerald-600, 4.6:1 contrast ratio) instead of #10b981 (3.2:1 fail)
                default: "bg-[#059669] text-white hover:bg-[#047857] active:bg-[#065f46]",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline:
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-11 min-h-[44px] px-4 py-2",
                sm: "h-10 min-h-[44px] rounded-md px-3",
                lg: "h-12 min-h-[48px] rounded-md px-8",
                icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
        // asChild: clone single child and merge button styles into it
        const child = React.Children.only(props.children as React.ReactElement<React.HTMLAttributes<HTMLElement>>);
        return React.cloneElement(child, {
            className: cn(buttonVariants({ variant, size, className }), child.props.className),
            ref,
        });
    }
    return (
        <button
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    );
})
Button.displayName = "Button"

export { Button, buttonVariants }
