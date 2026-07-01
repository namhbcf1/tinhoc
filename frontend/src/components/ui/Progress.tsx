// @ts-nocheck
import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Progress — WCAG 2.2 accessible progress bar
 * - role="progressbar" announced by screen readers
 * - aria-valuenow / aria-valuemin / aria-valuemax for current progress
 * - aria-label (or aria-labelledby) for context
 */
const Progress = React.forwardRef(({ className, value, label, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value || 0));

    return (
        <div
            ref={ref}
            role="progressbar"
            aria-valuenow={clampedValue}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label || `${clampedValue}%`}
            className={cn(
                "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
                className
            )}
            {...props}
        >
            <div
                className="h-full w-full flex-1 bg-primary transition-all"
                style={{ transform: `translateX(-${100 - clampedValue}%)` }}
                aria-hidden="true"
            />
        </div>
    )
})
Progress.displayName = "Progress"

export { Progress }
