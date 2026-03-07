import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

/**
 * Badge — WCAG 2.2 accessible badge
 * - Supports aria-label prop for when badge text alone lacks context
 *   e.g. <Badge aria-label="Trạng thái: Hoạt động">Hoạt động</Badge>
 * - Decorative badges (purely visual) can pass aria-hidden="true"
 */
function Badge({ className, variant, 'aria-label': ariaLabel, ...props }) {
    return (
        <div
            className={cn(badgeVariants({ variant }), className)}
            aria-label={ariaLabel}
            {...props}
        />
    )
}

export { Badge, badgeVariants }
