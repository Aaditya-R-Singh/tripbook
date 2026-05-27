"use client"

import { useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { PlusIcon, Loader2, RefreshCw, Route } from "lucide-react"
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
  source_location: string | null
  destination: string | null
  material: string
  trip_start_time: string
  amount: number | null
  payment_status: string
  status: string
  total_paid: number
  trucks: { truck_number: string } | null
}

type Truck = {
  id: string
  truck_number: string
}

type TripForm = {
  truck_id: string
  driver_name: string
  source_location: string
  destination: string
  material: string
  amount: string
  trip_time: string
}

const emptyForm: TripForm = {
  truck_id: "",
  driver_name: "",
  source_location: "",
  destination: "",
  material: "sand",
  amount: "",
  trip_time: "",
}

type DatePreset = "today" | "week" | "month" | "custom"

export default function TripsPage() {
  const supabase = getSupabase()
  const [trips, setTrips] = useState<TripRow[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)

  const [datePreset, setDatePreset] = useState<DatePreset>("today")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [truckFilter, setTruckFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TripForm>(emptyForm)

  const [payTrip, setPayTrip] = useState<TripRow | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payDate, setPayDate] = useState("")
  const [payMode, setPayMode] = useState("cash")
  const [markingPaid, setMarkingPaid] = useState(false)

  async function fetchData() {
    setError(null)
    try {
      const [tripsRes, trucksRes, paymentsRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*, trucks(truck_number)")
          .order("trip_start_time", { ascending: false }),
        supabase.from("trucks").select("id, truck_number").order("truck_number"),
        supabase.from("payments").select("trip_id, amount"),
      ])

      if (tripsRes.error) {
        throw new Error(tripsRes.error.message)
      }
      if (trucksRes.error) {
        throw new Error(trucksRes.error.message)
      }
      if (paymentsRes.error) {
        throw new Error(paymentsRes.error.message)
      }

      const paidMap: Record<string, number> = {}
      for (const p of paymentsRes.data ?? []) {
        paidMap[p.trip_id] = (paidMap[p.trip_id] ?? 0) + (p.amount ?? 0)
      }

      const tripsWithPaid = (tripsRes.data as unknown as TripRow[]).map((t) => ({
        ...t,
        total_paid: paidMap[t.id] ?? 0,
      }))

      setTrips(tripsWithPaid)
      setTrucks(trucksRes.data as unknown as Truck[])
    } catch (err) {
      console.error("Trips fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to load trips")
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
      await fetchData()
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = [...trips]

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (datePreset === "today") {
      result = result.filter(
        (t) => new Date(t.trip_start_time) >= startOfDay,
      )
    } else if (datePreset === "week") {
      const weekAgo = new Date(startOfDay)
      weekAgo.setDate(weekAgo.getDate() - 7)
      result = result.filter((t) => new Date(t.trip_start_time) >= weekAgo)
    } else if (datePreset === "month") {
      const monthAgo = new Date(startOfDay)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      result = result.filter((t) => new Date(t.trip_start_time) >= monthAgo)
    } else if (datePreset === "custom") {
      if (customStart) {
        result = result.filter(
          (t) => new Date(t.trip_start_time) >= new Date(customStart),
        )
      }
      if (customEnd) {
        const end = new Date(customEnd)
        end.setDate(end.getDate() + 1)
        result = result.filter((t) => new Date(t.trip_start_time) <= end)
      }
    }

    if (truckFilter !== "all") {
      result = result.filter((t) => t.truck_id === truckFilter)
    }

    if (paymentFilter !== "all") {
      result = result.filter((t) => t.payment_status === paymentFilter)
    }

    return result
  }, [trips, datePreset, customStart, customEnd, truckFilter, paymentFilter])

  const summary = useMemo(() => {
    const totalTrips = filtered.length
    const totalAmount = filtered.reduce((s, t) => s + (t.amount ?? 0), 0)
    const pendingAmount = filtered
      .filter((t) => t.payment_status === "pending")
      .reduce((s, t) => s + (t.amount ?? 0), 0)
    const paidAmount = filtered
      .filter((t) => t.payment_status === "paid")
      .reduce((s, t) => s + (t.amount ?? 0), 0)
    const partialLeftover = filtered
      .filter((t) => t.payment_status === "partial")
      .reduce((s, t) => s + ((t.amount ?? 0) - t.total_paid), 0)
    return { totalTrips, totalAmount, pendingAmount, paidAmount, partialLeftover }
  }, [filtered])

  const truckItems = useMemo(() => {
    const map: Record<string, string> = { all: "All Trucks" }
    for (const t of trucks) {
      map[t.id] = t.truck_number
    }
    return map
  }, [trucks])

  function localDatetime(d: Date) {
    const y = d.getFullYear()
    const M = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const h = String(d.getHours()).padStart(2, "0")
    const m = String(d.getMinutes()).padStart(2, "0")
    return `${y}-${M}-${day}T${h}:${m}`
  }

  function openAddDialog() {
    setForm({ ...emptyForm, trip_time: localDatetime(new Date()) })
    setDialogOpen(true)
  }

  async function handleAddTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!form.truck_id) {
      toast.error("Select a truck")
      return
    }

    setSaving(true)
    const { error } = await supabase.from("trips").insert({
      owner_id: ownerId,
      truck_id: form.truck_id,
      driver_name: form.driver_name.trim() || null,
      source_location: form.source_location.trim() || null,
      destination: form.destination.trim() || null,
      material: form.material || "sand",
      amount: form.amount ? parseFloat(form.amount) : null,
      trip_start_time: (form.trip_time || localDatetime(new Date())) + ":00",
    })

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    toast.success("Saved! ✅")
    setSaving(false)
    setDialogOpen(false)
    await fetchData()
  }

  function openPayDialog(trip: TripRow) {
    setPayTrip(trip)
    const leftover = (trip.amount ?? 0) - (trip.total_paid ?? 0)
    setPayAmount(leftover > 0 ? leftover.toString() : trip.amount?.toString() ?? "")
    setPayDate(format(new Date(), "yyyy-MM-dd"))
    setPayMode("cash")
  }

  async function handleMarkPaid(e: React.FormEvent) {
    e.preventDefault()
    if (!payTrip) return

    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    const fullAmount = payTrip.amount ?? 0
    const newTotalPaid = (payTrip.total_paid ?? 0) + amount
    const newStatus = newTotalPaid >= fullAmount ? "paid" : "partial"

    setMarkingPaid(true)
    try {
      const { error: updateErr } = await supabase
        .from("trips")
        .update({ payment_status: newStatus })
        .eq("id", payTrip.id)

      if (updateErr) throw new Error(updateErr.message)

      const { error: insertErr } = await supabase.from("payments").insert({
        owner_id: ownerId,
        trip_id: payTrip.id,
        amount,
        paid_at: payDate + "T00:00:00",
        notes: payMode,
      })

      if (insertErr) throw new Error(insertErr.message)

      toast.success("Saved! ✅")
      setPayTrip(null)
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as paid")
    } finally {
      setMarkingPaid(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Trips</h1>
        <Button onClick={openAddDialog} className="min-h-[48px]">
          <PlusIcon />
          <span className="hidden md:inline">Add Trip Manually</span>
          <span className="md:hidden">Add Trip</span>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date Range</Label>
              <div className="flex gap-1">
                {(["today", "week", "month", "custom"] as const).map((p) => (
                  <Button
                    key={p}
                    variant={datePreset === p ? "default" : "outline"}
                    size="sm"
                    className="min-h-[40px]"
                    onClick={() => setDatePreset(p)}
                  >
                    {p === "today"
                      ? "Today"
                      : p === "week"
                        ? "Week"
                        : p === "month"
                          ? "Month"
                          : "Custom"}
                  </Button>
                ))}
              </div>
            </div>

            {datePreset === "custom" && (
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

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Truck</Label>
              <Select value={truckFilter} onValueChange={(v) => setTruckFilter(v ?? "all")} items={truckItems}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trucks</SelectItem>
                  {trucks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.truck_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Payment</Label>
              <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v ?? "all")}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Trips</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="min-h-[40px]" onClick={() => { setLoading(true); fetchData().finally(() => setLoading(false)) }}>
                <RefreshCw className="size-4" />
                Try Again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <Route className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {trips.length === 0 ? "No trips yet" : "No trips match your filters"}
              </p>
              {trips.length === 0 && (
                <Button variant="outline" size="sm" className="min-h-[40px]" onClick={openAddDialog}>
                  <PlusIcon className="size-4" />
                  Add your first trip
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date & Time</TableHead>
                        <TableHead>Truck</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>From → To</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((trip) => (
                        <TableRow key={trip.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(trip.trip_start_time), "dd MMM, hh:mm a")}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {trip.trucks?.truck_number ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {trip.driver_name ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {trip.source_location ?? "?"} → {trip.destination ?? "?"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{trip.material}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {trip.amount != null ? `₹${trip.amount.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col items-start gap-0.5">
                              <Badge variant={trip.payment_status === "paid" ? "secondary" : trip.payment_status === "partial" ? "default" : "destructive"}>
                                {trip.payment_status}
                              </Badge>
                              {trip.payment_status === "partial" && (
                                <span className="text-xs text-muted-foreground">
                                  ₹{trip.total_paid.toLocaleString()} paid, ₹{((trip.amount ?? 0) - trip.total_paid).toLocaleString()} left
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant={trip.status === "active" ? "default" : "secondary"}>
                              {trip.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {(trip.payment_status === "pending" || trip.payment_status === "partial") && (
                              <Button variant="outline" size="sm" onClick={() => openPayDialog(trip)}>
                                {trip.payment_status === "partial" ? "Pay More" : "Mark Paid"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((trip) => (
                  <div key={trip.id} className="rounded-lg border bg-white p-4 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-base">{trip.trucks?.truck_number ?? "—"}</span>
                      <Badge variant={trip.status === "active" ? "default" : "secondary"}>{trip.status}</Badge>
                    </div>
                    <div className="space-y-1.5 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="text-foreground">{format(new Date(trip.trip_start_time), "dd MMM, hh:mm a")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Driver:</span>
                        <span className="text-foreground">{trip.driver_name ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Route:</span>
                        <span className="text-foreground">{trip.source_location ?? "?"} → {trip.destination ?? "?"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Material:</span>
                        <span className="text-foreground">{trip.material}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <div className="text-right">
                          <span className="text-foreground font-medium">{trip.amount != null ? `₹${trip.amount.toLocaleString()}` : "—"}</span>
                          {trip.payment_status === "partial" && (
                            <div className="text-xs text-muted-foreground">
                              ₹{trip.total_paid.toLocaleString()} paid, ₹{((trip.amount ?? 0) - trip.total_paid).toLocaleString()} left
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-col gap-0.5">
                          <Badge variant={trip.payment_status === "paid" ? "secondary" : trip.payment_status === "partial" ? "default" : "destructive"}>
                            {trip.payment_status}
                          </Badge>
                        </div>
                        {(trip.payment_status === "pending" || trip.payment_status === "partial") && (
                          <Button variant="outline" size="sm" className="min-h-[40px]" onClick={() => openPayDialog(trip)}>
                            {trip.payment_status === "partial" ? "Pay More" : "Mark Paid"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!loading && filtered.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Total Trips: </span>
                <span className="font-semibold">{summary.totalTrips}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Amount: </span>
                <span className="font-semibold">₹{summary.totalAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pending: </span>
                <span className="font-semibold text-red-600">₹{(summary.pendingAmount + summary.partialLeftover).toLocaleString()}</span>
                {summary.partialLeftover > 0 && (
                  <span className="text-xs text-muted-foreground"> (incl. ₹{summary.partialLeftover.toLocaleString()} partial)</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-semibold text-green-600">₹{summary.paidAmount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Trip Dialog — mobile bottom sheet */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="mobile-bottom-sheet">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Trip</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTrip} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="truck_id">Truck *</Label>
                <Select
                  value={form.truck_id}
                  onValueChange={(v) => setForm({ ...form, truck_id: v ?? "" })}
                  items={truckItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.truck_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver_name">Driver Name</Label>
                <Input
                  id="driver_name"
                  placeholder="e.g. Raju"
                  value={form.driver_name}
                  onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="source_location">Source Location</Label>
                  <Input
                    id="source_location"
                    placeholder="e.g. Wardha Ghaat"
                    value={form.source_location}
                    onChange={(e) => setForm({ ...form, source_location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    placeholder="e.g. Nagpur Site 3"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    placeholder="sand"
                    value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip_time">Trip Date & Time</Label>
                <Input
                  id="trip_time"
                  type="datetime-local"
                  value={form.trip_time}
                  onChange={(e) => setForm({ ...form, trip_time: e.target.value })}
                />
              </div>
              <DialogFooter showCloseButton>
                <Button type="submit" disabled={saving} className="min-h-[48px]">
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? "Saving..." : "Add Trip"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </div>
      </Dialog>

      <Dialog open={!!payTrip} onOpenChange={() => setPayTrip(null)}>
        <div className="mobile-bottom-sheet">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as Paid</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMarkPaid} className="space-y-4">
              {payTrip && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    Truck:{" "}
                    <span className="font-medium text-foreground">
                      {payTrip.trucks?.truck_number}
                    </span>
                  </p>
                  <p>
                    Total Amount:{" "}
                    <span className="font-medium text-foreground">
                      ₹{payTrip.amount?.toLocaleString() ?? "—"}
                    </span>
                  </p>
                  {(payTrip.total_paid ?? 0) > 0 && (
                    <p>
                      Already Paid:{" "}
                      <span className="font-medium text-green-600">
                        ₹{payTrip.total_paid.toLocaleString()}
                      </span>
                    </p>
                  )}
                  {(payTrip.total_paid ?? 0) > 0 && (
                    <p>
                      Leftover:{" "}
                      <span className="font-medium text-red-600">
                        ₹{((payTrip.amount ?? 0) - payTrip.total_paid).toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="paid_amount">Amount (₹) *</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid_date">Payment Date *</Label>
                <Input
                  id="paid_date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid_mode">Payment Mode</Label>
                <Select value={payMode} onValueChange={(v) => setPayMode(v ?? "cash")}>
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
