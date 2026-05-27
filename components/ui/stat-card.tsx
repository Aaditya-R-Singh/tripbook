import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  gradient,
}: {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: { label: string; positive: boolean }
  loading?: boolean
  gradient?: "orange" | "emerald" | "amber" | "red" | "none"
}) {
  const gradientClasses = {
    orange: "bg-gradient-orange-subtle",
    emerald: "bg-gradient-emerald-subtle",
    amber: "bg-gradient-amber-subtle",
    red: "bg-gradient-red-subtle",
    none: "",
  }

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-premium-card transition-all hover:shadow-premium-md hover:-translate-y-0.5",
      gradient && gradient !== "none" && gradientClasses[gradient],
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {title}
            </p>
          {loading ? (
            <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            gradient === "orange" ? "bg-orange-100 text-orange-600" :
            gradient === "emerald" ? "bg-emerald-100 text-emerald-600" :
            gradient === "amber" ? "bg-amber-100 text-amber-600" :
            gradient === "red" ? "bg-red-100 text-red-600" :
            "bg-muted text-muted-foreground"
          )}>
            <Icon className="size-4" />
          </div>
        )}
      </div>
      {trend && !loading && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className={trend.positive ? "text-emerald-600" : "text-red-600"}>
            {trend.label}
          </span>
        </div>
      )}
    </div>
  )
}
