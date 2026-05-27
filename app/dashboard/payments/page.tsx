"use client"

import { useEffect, useState, useMemo } from "react"
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from "date-fns"
import toast from "react-hot-toast"
import {
  Loader2,
  RefreshCw,
  Printer,
  Wallet,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TripRow = {
  id: string
  truck_id: string
  driver_name: string | null
  destination: string | null
  amount: number | null
  payment_status: string
  trip_start_time: string
  total_paid: number
  trucks: { truck_number: string } | null
}

type MonthPreset = "this" | "last" | "custom"

export default function PaymentsPage() {
  const supabase = getSupabase()
  const [trips, setTrips] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)

  const [monthPreset, setMonthPreset] = useState<MonthPreset>("this")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const [markPaidTrip, setMarkPaidTrip] = useState<TripRow | null>(null)
  const [paidAmount, setPaidAmount] = useState("")
  const [paidDate, setPaidDate] = useState("")
  const [paidMode, setPaidMode] = useState("cash")
  const [markingPaid, setMarkingPaid] = useState(false)

  async function loadData() {
    setError(null)
    try {
      const [tripsRes, paymentsRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*, trucks(truck_number)")
          .not("destination", "is", null)
          .order("trip_start_time", { ascending: false }),
        supabase.from("payments").select("trip_id, amount"),
      ])

      if (tripsRes.error) throw new Error(tripsRes.error.message)
      if (paymentsRes.error) throw new Error(paymentsRes.error.message)

      const paidMap: Record<string, number> = {}
      for (const p of paymentsRes.data ?? []) {
        paidMap[p.trip_id] = (paidMap[p.trip_id] ?? 0) + (p.amount ?? 0)
      }

      setTrips(
        ((tripsRes.data ?? []) as unknown as TripRow[]).map((t) => ({
          ...t,
          total_paid: paidMap[t.id] ?? 0,
        })),
      )
    } catch (err) {
      console.error("Payments load error:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: { user: { id: string } | null } | null } | null }) => {
      setOwnerId(data?.session?.user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await loadData()
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()

  const filteredTrips = useMemo(() => {
    let result = [...trips]

    let start: Date | null = null
    let end: Date | null = null

    if (monthPreset === "this") {
      start = startOfMonth(now)
      end = endOfMonth(now)
    } else if (monthPreset === "last") {
      const lastMonth = subMonths(now, 1)
      start = startOfMonth(lastMonth)
      end = endOfMonth(lastMonth)
    } else if (monthPreset === "custom") {
      if (customStart) start = new Date(customStart)
      if (customEnd) {
        end = new Date(customEnd)
        end.setDate(end.getDate() + 1)
      }
    }

    if (start) {
      result = result.filter((t) => new Date(t.trip_start_time) >= start)
    }
    if (end) {
      result = result.filter((t) => new Date(t.trip_start_time) <= end)
    }

    return result
  }, [trips, monthPreset, customStart, customEnd])

  const customerGroups = useMemo(() => {
    const groups: Record<string, TripRow[]> = {}
    for (const trip of filteredTrips) {
      const dest = trip.destination ?? "Unknown"
      if (!groups[dest]) groups[dest] = []
      groups[dest].push(trip)
    }
    return groups
  }, [filteredTrips])

  const summary = useMemo(() => {
    let totalPending = 0
    let totalPaid = 0
    let overdueCount = 0

    for (const trip of filteredTrips) {
      if (trip.payment_status === "pending") {
        totalPending += trip.amount ?? 0
        const daysSince = differenceInDays(now, new Date(trip.trip_start_time))
        if (daysSince > 7) overdueCount++
      } else if (trip.payment_status === "paid") {
        totalPaid += trip.amount ?? 0
      } else if (trip.payment_status === "partial") {
        totalPending += (trip.amount ?? 0) - trip.total_paid
        totalPaid += trip.total_paid
        const daysSince = differenceInDays(now, new Date(trip.trip_start_time))
        if (daysSince > 7) overdueCount++
      }
    }

    return { totalPending, totalPaid, overdueCount }
  }, [filteredTrips])

  function openMarkPaid(trip: TripRow) {
    setMarkPaidTrip(trip)
    const leftover = (trip.amount ?? 0) - (trip.total_paid ?? 0)
    setPaidAmount(leftover > 0 ? leftover.toString() : trip.amount?.toString() ?? "")
    setPaidDate(format(new Date(), "yyyy-MM-dd"))
    setPaidMode("cash")
  }

  async function handleMarkPaid(e: React.FormEvent) {
    e.preventDefault()
    if (!markPaidTrip) return

    const amount = parseFloat(paidAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    const fullAmount = markPaidTrip.amount ?? 0
    const newTotalPaid = (markPaidTrip.total_paid ?? 0) + amount
    const newStatus = newTotalPaid >= fullAmount ? "paid" : "partial"

    setMarkingPaid(true)
    try {
      const { error: updateErr } = await supabase
        .from("trips")
        .update({ payment_status: newStatus })
        .eq("id", markPaidTrip.id)

      if (updateErr) throw new Error(updateErr.message)

      const { error: insertErr } = await supabase.from("payments").insert({
        owner_id: ownerId,
        trip_id: markPaidTrip.id,
        amount,
        paid_at: paidDate + "T00:00:00",
        notes: paidMode,
      })

      if (insertErr) throw new Error(insertErr.message)

      toast.success("Saved! ✅")
      setMarkPaidTrip(null)

      setTrips((prev) =>
        prev.map((t) =>
          t.id === markPaidTrip.id
            ? { ...t, payment_status: newStatus, total_paid: newTotalPaid }
            : t,
        ),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as paid")
    } finally {
      setMarkingPaid(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Print header */}
      <div className="print-only hidden">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Payment Report</h1>
          <p className="text-sm text-muted-foreground">
            {monthPreset === "this"
              ? format(now, "MMMM yyyy")
              : monthPreset === "last"
                ? format(subMonths(now, 1), "MMMM yyyy")
                : `${customStart || "..."} to ${customEnd || "..."}`}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <h1 className="text-xl font-semibold md:text-2xl">Payments</h1>
        <Button onClick={() => window.print()} variant="outline" className="min-h-[48px]">
          <Printer className="size-4" />
          <span className="hidden md:inline">Print / PDF</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Select
                value={monthPreset}
                onValueChange={(v) => setMonthPreset(v as MonthPreset)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this">This Month</SelectItem>
                  <SelectItem value="last">Last Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {monthPreset === "custom" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    className="h-10"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    className="h-10"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="text-lg font-semibold text-red-600">
                ₹{summary.totalPending.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="text-lg font-semibold text-green-600">
                ₹{summary.totalPaid.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p
                className={`text-lg font-semibold ${
                  summary.overdueCount > 0
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {summary.overdueCount} trip{summary.overdueCount !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue alert */}
      {!loading && summary.overdueCount > 0 && (
        <div className="no-print flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {summary.overdueCount} trip{summary.overdueCount !== 1 ? "s" : ""} pending
            for over 7 days
          </span>
        </div>
      )}

      {/* Customer breakdown */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px]"
            onClick={() => {
              setLoading(true)
              loadData().finally(() => setLoading(false))
            }}
          >
            <RefreshCw className="size-4" />
            Try Again
          </Button>
        </div>
      ) : Object.keys(customerGroups).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Wallet className="mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No trips found for this period
          </p>
        </div>
      ) : (
        Object.entries(customerGroups).map(([destination, destTrips]) => {
          const destPending = destTrips
            .filter((t) => t.payment_status === "pending")
            .reduce((s, t) => s + (t.amount ?? 0), 0)
          const destPaid = destTrips
            .filter((t) => t.payment_status === "paid")
            .reduce((s, t) => s + (t.amount ?? 0), 0)

          return (
            <Card key={destination}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{destination}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Pending:{" "}
                    <span className="font-medium text-red-600">
                      ₹{destPending.toLocaleString()}
                    </span>{" "}
                    | Paid:{" "}
                    <span className="font-medium text-green-600">
                      ₹{destPaid.toLocaleString()}
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Desktop */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead>Truck</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {destTrips.map((trip) => {
                          const isOverdue =
                            trip.payment_status === "pending" &&
                            differenceInDays(now, new Date(trip.trip_start_time)) > 7
                          return (
                            <TableRow
                              key={trip.id}
                              className={isOverdue ? "bg-red-50" : ""}
                            >
                              <TableCell className="whitespace-nowrap">
                                {format(
                                  new Date(trip.trip_start_time),
                                  "dd MMM",
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap font-medium">
                                {trip.trucks?.truck_number ?? "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {trip.driver_name ?? "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right">
                                {trip.amount != null
                                  ? `₹${trip.amount.toLocaleString()}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex flex-col items-start gap-0.5">
                                  {isOverdue ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                      <AlertTriangle className="size-3" />
                                      Overdue
                                    </span>
                                  ) : (
                                    <Badge
                                      variant={
                                        trip.payment_status === "paid"
                                          ? "secondary"
                                          : trip.payment_status === "partial"
                                            ? "default"
                                            : "destructive"
                                      }
                                    >
                                      {trip.payment_status}
                                    </Badge>
                                  )}
                                  {trip.payment_status === "partial" && (
                                    <span className="text-xs text-muted-foreground">
                                      ₹{trip.total_paid.toLocaleString()} paid, ₹{((trip.amount ?? 0) - trip.total_paid).toLocaleString()} left
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right">
                                {(trip.payment_status === "pending" || trip.payment_status === "partial") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkPaid(trip)}
                                  >
                                    <CheckCircle className="size-3" />
                                    {trip.payment_status === "partial" ? "Pay More" : "Mark Paid"}
                                  </Button>
                                )}
                                {trip.payment_status === "paid" && (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle className="size-3" />
                                    Paid
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-3 md:hidden">
                  {destTrips.map((trip) => {
                    const isOverdue =
                      trip.payment_status === "pending" &&
                      differenceInDays(now, new Date(trip.trip_start_time)) > 7
                    return (
                      <div
                        key={trip.id}
                        className={`rounded-lg border p-4 text-sm ${
                          isOverdue
                            ? "border-red-200 bg-red-50"
                            : "bg-white"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-base font-semibold">
                            {trip.trucks?.truck_number ?? "—"}
                          </span>
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                              <AlertTriangle className="size-3" />
                              Overdue
                            </span>
                          ) : (
                            <Badge
                              variant={
                                trip.payment_status === "paid"
                                  ? "secondary"
                                  : trip.payment_status === "partial"
                                    ? "default"
                                    : "destructive"
                              }
                            >
                              {trip.payment_status}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1.5 text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Date:</span>
                            <span className="text-foreground">
                              {format(
                                new Date(trip.trip_start_time),
                                "dd MMM yyyy",
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Driver:</span>
                            <span className="text-foreground">
                              {trip.driver_name ?? "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <div className="text-right">
                              <span
                                className={`font-medium ${
                                  isOverdue ? "text-red-600" : "text-foreground"
                                }`}
                              >
                                {trip.amount != null
                                  ? `₹${trip.amount.toLocaleString()}`
                                  : "—"}
                              </span>
                              {trip.payment_status === "partial" && (
                                <div className="text-xs text-muted-foreground">
                                  ₹{trip.total_paid.toLocaleString()} paid, ₹{((trip.amount ?? 0) - trip.total_paid).toLocaleString()} left
                                </div>
                              )}
                            </div>
                          </div>
                          {(trip.payment_status === "pending" || trip.payment_status === "partial") && (
                            <div className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full min-h-[40px]"
                                onClick={() => openMarkPaid(trip)}
                              >
                                <CheckCircle className="size-3" />
                                {trip.payment_status === "partial" ? "Pay More" : "Mark Paid"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      {/* Mark as Paid dialog */}
      <Dialog
        open={!!markPaidTrip}
        onOpenChange={() => setMarkPaidTrip(null)}
      >
        <div className="mobile-bottom-sheet">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{(markPaidTrip?.total_paid ?? 0) > 0 ? "Pay More" : "Mark as Paid"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMarkPaid} className="space-y-4">
              {markPaidTrip && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    Truck:{" "}
                    <span className="font-medium text-foreground">
                      {markPaidTrip.trucks?.truck_number}
                    </span>
                  </p>
                  <p>
                    Destination:{" "}
                    <span className="font-medium text-foreground">
                      {markPaidTrip.destination}
                    </span>
                  </p>
                  <p>
                    Total Amount:{" "}
                    <span className="font-medium text-foreground">
                      ₹{markPaidTrip.amount?.toLocaleString() ?? "—"}
                    </span>
                  </p>
                  {(markPaidTrip.total_paid ?? 0) > 0 && (
                    <>
                      <p>
                        Already Paid:{" "}
                        <span className="font-medium text-green-600">
                          ₹{markPaidTrip.total_paid.toLocaleString()}
                        </span>
                      </p>
                      <p>
                        Leftover:{" "}
                        <span className="font-medium text-red-600">
                          ₹{((markPaidTrip.amount ?? 0) - markPaidTrip.total_paid).toLocaleString()}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="paid_amount">Amount (₹) *</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid_date">Payment Date *</Label>
                <Input
                  id="paid_date"
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid_mode">Payment Mode</Label>
                <Select value={paidMode} onValueChange={(v) => setPaidMode(v ?? "cash")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter showCloseButton>
                <Button
                  type="submit"
                  disabled={markingPaid}
                  className="min-h-[48px]"
                >
                  {markingPaid && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {markingPaid ? "Saving..." : "Confirm Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </div>
      </Dialog>
    </div>
  )
}
