"use client"

import { cn } from "@/lib/utils"

export type TextShimmerProps = {
  as?: string
  duration?: number
  spread?: number
  children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>

export function TextShimmer({
  as = "span",
  className,
  duration = 4,
  spread = 20,
  children,
  style,
  ...props
}: TextShimmerProps) {
  const dynamicSpread = Math.min(Math.max(spread, 5), 45)
  const Component = as as React.ElementType

  return (
    <Component
      className={cn(
        "relative inline-grid items-center font-medium",
        className
      )}
      style={style}
      {...props}
    >
      <span className="col-start-1 row-start-1 text-current">{children}</span>
      <span
        aria-hidden="true"
        className="text-shimmer-overlay pointer-events-none col-start-1 row-start-1 text-transparent"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent ${50 - dynamicSpread * 1.6}%, rgba(36, 81, 209, 0.22) ${50 - dynamicSpread * 0.65}%, #2451d1 50%, rgba(36, 81, 209, 0.22) ${50 + dynamicSpread * 0.65}%, transparent ${50 + dynamicSpread * 1.6}%)`,
          backgroundSize: "240% auto",
          backgroundPosition: "200% center",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: `shimmer ${duration}s linear infinite`,
        }}
      >
        {children}
      </span>
    </Component>
  )
}
