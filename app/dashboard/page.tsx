"use client"

import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { RefreshCw, Plus, Truck, Route, Wallet, ShieldCheck, ArrowUpRight } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { PageSkeleton } from "@/components/ui/loading-skeleton"
import { usePullToRefresh } from "@/lib/use-pull-to-refresh"
import { useRouter } from "next/navigation"

type RecentTrip = {
  id: string
  truck_number: string
  driver_name: string | null
  source_location: string | null
  destination: string | null
  trip_start_time: string
  status: string
  amount: number | null
  payment_status: string
}

type ExpiringPass = {
  id: string
  truck_number: string
  epass_expiry_date: string
  days_remaining: number
}

export default function DashboardPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [todayTrips, setTodayTrips] = useState(0)
  const [activeTrucks, setActiveTrucks] = useState(0)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [expiringSoon, setExpiringSoon] = useState(0)
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([])
  const [expiringPasses, setExpiringPasses] = useState<ExpiringPass[]>([])
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: owner } = await supabase
          .from("owners")
          .select("name")
          .eq("id", user.id)
          .single()
        if (owner) setOwnerName(owner.name)
      }

      const today = new Date().toISOString().slice(0, 10)
      const sevenDaysLater = new Date()
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      const sevenDaysLaterStr = sevenDaysLater.toISOString().slice(0, 10)

      const [
        { count: tripsCount },
        { count: trucksCount },
        { data: pendingData },
        { data: expiringData },
        { data: tripsData },
        { data: passData },
      ] = await Promise.all([
        supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today),
        supabase
          .from("trucks")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("trips")
          .select("amount")
          .eq("payment_status", "pending"),
        supabase
          .from("trucks")
          .select("id", { count: "exact", head: true })
          .not("epass_expiry_date", "is", null)
          .lte("epass_expiry_date", sevenDaysLaterStr)
          .gte("epass_expiry_date", today),
        supabase
          .from("trips")
          .select("id, driver_name, source_location, destination, trip_start_time, status, amount, payment_status, trucks (truck_number)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("trucks")
          .select("id, truck_number, epass_expiry_date")
          .not("epass_expiry_date", "is", null)
          .lte("epass_expiry_date", sevenDaysLaterStr)
          .gte("epass_expiry_date", today),
      ])

      setTodayTrips(tripsCount ?? 0)
      setActiveTrucks(trucksCount ?? 0)
      setPendingAmount(
        (pendingData as { amount: number | null }[] | null)?.reduce(
          (s, t) => s + (t.amount ?? 0),
          0,
        ) ?? 0,
      )
      setExpiringSoon(expiringData?.length ?? 0)

      setRecentTrips(
        ((tripsData as unknown as RecentTrip[]) ?? []).map((t) => ({
          ...t,
          truck_number: (t as unknown as { trucks: { truck_number: string } }).trucks?.truck_number ?? "—",
        })),
      )

      const now = new Date()
      setExpiringPasses(
        ((passData as { id: string; truck_number: string; epass_expiry_date: string }[]) ?? [])
          .map((t) => ({
            ...t,
            days_remaining: Math.ceil(
              (new Date(t.epass_expiry_date).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          }))
          .sort((a, b) => a.days_remaining - b.days_remaining),
      )
    } catch (err) {
      console.error("Dashboard load error:", err)
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await loadData()
      setLoading(false)
    }
    load()
  }, [loadData])

  const { indicator, handlers } = usePullToRefresh(loadData)

  if (loading) return <PageSkeleton />

  return (
    <div {...handlers} className="space-y-6 p-4 md:p-6 lg:p-8">
      {indicator}

      {/* Error banner */}
      {error && (
        <div className="animate-slide-down rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between shadow-premium-sm">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); loadData().finally(() => setLoading(false)) }}>
            <RefreshCw className="size-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Hero section */}
      <div className="stagger-children">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
            Good morning, <span className="text-gradient-brand">{ownerName || "Boss"}</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Here&apos;s your fleet overview for today
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stagger-children grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Trips"
          value={todayTrips}
          icon={Route}
          gradient="orange"
        />
        <StatCard
          title="Active Trucks"
          value={activeTrucks}
          icon={Truck}
          gradient="emerald"
        />
        <StatCard
          title="Pending Payments"
          value={`₹${pendingAmount.toLocaleString()}`}
          icon={Wallet}
          trend={{ label: "Awaiting collection", positive: false }}
          gradient="amber"
        />
        <StatCard
          title="E-Pass Expiring"
          value={expiringSoon}
          icon={ShieldCheck}
          gradient={expiringSoon > 0 ? "red" : "emerald"}
        />
      </div>

      {/* Recent Trips */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Trips</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/trips")} className="gap-1">
              View all
              <ArrowUpRight className="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:px-5 sm:pb-5">
          {recentTrips.length === 0 ? (
            <EmptyState
              icon={Route}
              title="No trips yet today"
              description="Start by adding your first trip of the day"
              action={
                <Button variant="default" size="sm" onClick={() => router.push("/dashboard/trips")}>
                  <Plus className="size-4" />
                  Add Trip
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Truck</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTrips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">{trip.truck_number}</TableCell>
                        <TableCell className="text-muted-foreground">{trip.driver_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{trip.source_location ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{trip.destination ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(trip.trip_start_time), "hh:mm a")}</TableCell>
                        <TableCell>
                          <Badge variant={trip.status === "active" ? "orange" : "secondary"}>{trip.status}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{trip.amount != null ? `₹${trip.amount.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={trip.payment_status === "paid" ? "success" : "warning"}>{trip.payment_status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden px-4 pb-4">
                {recentTrips.map((trip) => (
                  <div key={trip.id} className="rounded-xl border bg-white p-4 text-sm shadow-premium-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-base">{trip.truck_number}</span>
                      <Badge variant={trip.status === "active" ? "orange" : "secondary"}>{trip.status}</Badge>
                    </div>
                    <div className="space-y-1.5 text-muted-foreground text-xs">
                      <div className="flex justify-between">
                        <span>Driver:</span>
                        <span className="text-foreground font-medium">{trip.driver_name ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Route:</span>
                        <span className="text-foreground font-medium">{trip.source_location ?? "?"} → {trip.destination ?? "?"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="text-foreground font-medium">{format(new Date(trip.trip_start_time), "hh:mm a")}</span>
                      </div>
                      <div className="border-t my-2" />
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="text-foreground font-semibold">{trip.amount != null ? `₹${trip.amount.toLocaleString()}` : "—"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Payment:</span>
                        <Badge variant={trip.payment_status === "paid" ? "success" : "warning"} className="text-[10px]">{trip.payment_status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* E-Pass Expiring */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>E-Pass Expiring Soon</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/epass")} className="gap-1">
              View all
              <ArrowUpRight className="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:px-5 sm:pb-5">
          {expiringPasses.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="All e-passes are up to date"
              description="No e-passes expiring in the next 7 days"
              action={
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/epass")}>
                  View all e-passes
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Truck</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringPasses.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.truck_number}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(t.epass_expiry_date), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={t.days_remaining <= 3 ? "destructive" : "warning"}>
                            {t.days_remaining} day{t.days_remaining !== 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden px-4 pb-4">
                {expiringPasses.map((t) => (
                  <div key={t.id} className="rounded-xl border bg-white p-4 text-sm shadow-premium-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold text-base">{t.truck_number}</span>
                      <Badge variant={t.days_remaining <= 3 ? "destructive" : "warning"} className="text-[10px]">
                        {t.days_remaining}d
                      </Badge>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Expires: {format(new Date(t.epass_expiry_date), "dd MMM yyyy")}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
