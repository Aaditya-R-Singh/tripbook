import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

export function PageSkeleton({
  className,
  statCards = 4,
}: {
  className?: string
  statCards?: number
}) {
  return (
    <div className={cn("space-y-6 p-4 md:p-6", className)}>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: statCards }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-4 shadow-premium-sm">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-5 shadow-premium-sm">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
