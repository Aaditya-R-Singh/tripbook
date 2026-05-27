"use client"

import { useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { BellIcon, RefreshCwIcon, SendIcon, Loader2, RefreshCw, ShieldCheck, PlusIcon } from "lucide-react"
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

type TruckEpass = {
  id: string
  truck_number: string
  epass_number: string | null
  epass_expiry_date: string | null
  is_active: boolean
}

type Reminder = {
  truck_id: string
  sent_at: string
}

type UpdateForm = {
  epass_number: string
  epass_expiry_date: string
}

export default function EpassPage() {
  const supabase = getSupabase()
  const [trucks, setTrucks] = useState<TruckEpass[]>([])
  const [reminders, setReminders] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set())
  const [sendingAll, setSendingAll] = useState(false)
  const [editTruck, setEditTruck] = useState<TruckEpass | null>(null)
  const [editForm, setEditForm] = useState<UpdateForm>({
    epass_number: "",
    epass_expiry_date: "",
  })
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setError(null)
    try {
      const [trucksRes, remindersRes] = await Promise.all([
        supabase
          .from("trucks")
          .select("id, truck_number, epass_number, epass_expiry_date, is_active")
          .order("truck_number"),
        supabase
          .from("epass_reminders")
          .select("truck_id, sent_at")
          .order("sent_at", { ascending: false }),
      ])

      if (trucksRes.error) throw new Error(trucksRes.error.message)
      if (remindersRes.error) throw new Error(remindersRes.error.message)

      setTrucks(trucksRes.data as TruckEpass[])
      const latest: Record<string, string> = {}
      for (const r of remindersRes.data as Reminder[]) {
        if (!latest[r.truck_id]) {
          latest[r.truck_id] = r.sent_at
        }
      }
      setReminders(latest)
    } catch (err) {
      console.error("E-pass fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      await fetchData()
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const categorized = useMemo(() => {
    const expired: TruckEpass[] = []
    const expiring: TruckEpass[] = []
    const valid: TruckEpass[] = []
    const none: TruckEpass[] = []

    for (const t of trucks) {
      if (!t.epass_expiry_date) {
        none.push(t)
        continue
      }
      const expiry = new Date(t.epass_expiry_date)
      const diff = Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (diff < 0) {
        expired.push(t)
      } else if (diff <= 7) {
        expiring.push(t)
      } else {
        valid.push(t)
      }
    }

    return { expired, expiring, valid, none }
  }, [trucks, today])

  const allRows = useMemo(() => {
    return [...categorized.expired, ...categorized.expiring, ...categorized.valid, ...categorized.none]
  }, [categorized])

  const expiringAndExpiredIds = useMemo(
    () => [...categorized.expired, ...categorized.expiring].map((t) => t.id),
    [categorized],
  )

  function getDaysRemaining(dateStr: string): number {
    const expiry = new Date(dateStr)
    return Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    )
  }

  function getStatusLabel(dateStr: string | null): {
    label: string
    color: "destructive" | "warning" | "success" | "secondary"
  } {
    if (!dateStr) return { label: "No E-Pass", color: "secondary" }
    const days = getDaysRemaining(dateStr)
    if (days < 0) return { label: "Expired", color: "destructive" }
    if (days <= 3) return { label: "Critical", color: "destructive" }
    if (days <= 7) return { label: "Expiring Soon", color: "warning" }
    return { label: "Valid", color: "success" }
  }

  async function sendReminder(truckId: string) {
    setSendingIds((prev) => new Set(prev).add(truckId))
    try {
      const res = await fetch("/api/send-epass-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truckIds: [truckId] }),
      })
      const data = await res.json()
      if (!res.ok || data.results?.[0]?.success === false) {
        throw new Error(data.results?.[0]?.error ?? "Failed to send")
      }
      toast.success("Reminder sent!")
      await fetchData()
    } catch (err) {
      console.error("WhatsApp reminder error:", err)
      toast.error("WhatsApp message nahi gaya, baad mein try karo")
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev)
        next.delete(truckId)
        return next
      })
    }
  }

  async function sendAllReminders() {
    if (expiringAndExpiredIds.length === 0) {
      toast.error("No trucks need reminders")
      return
    }
    setSendingAll(true)
    try {
      const res = await fetch("/api/send-epass-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truckIds: expiringAndExpiredIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to send")
      const successCount = data.results?.filter(
        (r: { success: boolean }) => r.success,
      ).length
      toast.success(`${successCount ?? 0} reminders sent!`)
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminders")
    } finally {
      setSendingAll(false)
    }
  }

  function openEditDialog(truck: TruckEpass) {
    setEditTruck(truck)
    setEditForm({
      epass_number: truck.epass_number ?? "",
      epass_expiry_date: truck.epass_expiry_date ?? "",
    })
  }

  async function handleUpdateEpass(e: React.FormEvent) {
    e.preventDefault()
    if (!editTruck) return

    setSaving(true)
    const { error } = await supabase
      .from("trucks")
      .update({
        epass_number: editForm.epass_number.trim() || null,
        epass_expiry_date: editForm.epass_expiry_date || null,
      })
      .eq("id", editTruck.id)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    toast.success("Saved! ✅")
    setSaving(false)
    setEditTruck(null)
    await fetchData()
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">E-Pass Alerts</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="min-h-[48px]"
            onClick={sendAllReminders}
            disabled={sendingAll || expiringAndExpiredIds.length === 0}
          >
            {sendingAll ? (
              <RefreshCwIcon className="animate-spin" />
            ) : (
              <SendIcon />
            )}
            <span className="hidden md:inline">Send All</span>
            <span className="md:hidden">({expiringAndExpiredIds.length})</span>
          </Button>
          <Button variant="outline" size="icon" className="min-h-[48px] min-w-[48px]" onClick={fetchData}>
            <RefreshCwIcon />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
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
      ) : (
        <div className="grid gap-4 grid-cols-3"><Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-700 dark:text-red-400">
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {categorized.expired.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-yellow-700 dark:text-yellow-400">
                Expiring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">
                {categorized.expiring.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-700 dark:text-green-400">
                Valid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {categorized.valid.length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Trucks — E-Pass Status</CardTitle>
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
          ) : allRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <ShieldCheck className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No trucks yet — add your first truck to start tracking e-passes</p>
              <Button variant="outline" size="sm" className="min-h-[40px]" onClick={() => window.location.href = "/dashboard/trucks"}>
                <PlusIcon className="size-4" />
                Add a truck
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Truck</TableHead>
                        <TableHead>E-Pass Number</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Days Left</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Reminder</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRows.map((truck) => {
                        const status = getStatusLabel(truck.epass_expiry_date)
                        const days = truck.epass_expiry_date
                          ? getDaysRemaining(truck.epass_expiry_date)
                          : null
                        const lastSent = reminders[truck.id]
                        const isExpiringOrExpired =
                          truck.epass_expiry_date &&
                          getDaysRemaining(truck.epass_expiry_date) <= 7
                        const isSending = sendingIds.has(truck.id)

                        return (
                          <TableRow
                            key={truck.id}
                            className={
                              status.label === "Expired"
                                ? "bg-red-50/50 dark:bg-red-950/10"
                                : status.label === "Critical"
                                  ? "bg-red-50/30 dark:bg-red-950/5"
                                  : status.label === "Expiring Soon"
                                    ? "bg-yellow-50/30 dark:bg-yellow-950/5"
                                    : ""
                            }
                          >
                            <TableCell className="font-medium">{truck.truck_number}</TableCell>
                            <TableCell>{truck.epass_number ?? "—"}</TableCell>
                            <TableCell>
                              {truck.epass_expiry_date ? (
                                <span className={
                                  days !== null && days <= 0
                                    ? "text-red-600 font-medium"
                                    : days !== null && days <= 3
                                      ? "text-red-600 font-medium"
                                      : days !== null && days <= 7
                                        ? "text-yellow-600 font-medium"
                                        : ""
                                }>
                                  {format(new Date(truck.epass_expiry_date), "dd MMM yyyy")}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {days !== null ? (
                                <span className={
                                  days <= 0 ? "text-red-600 font-bold" : days <= 3 ? "text-red-600 font-semibold" : days <= 7 ? "text-yellow-600 font-semibold" : "text-green-600"
                                }>
                                  {days <= 0 ? "Expired" : `${days} day${days !== 1 ? "s" : ""}`}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.color === "destructive" ? "destructive" : status.color === "warning" ? "destructive" : status.color === "success" ? "secondary" : "secondary"}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {lastSent ? format(new Date(lastSent), "dd MMM, hh:mm a") : "Never"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {isExpiringOrExpired && (
                                  <Button variant="outline" size="icon-sm" disabled={isSending} onClick={() => sendReminder(truck.id)}>
                                    {isSending ? <RefreshCwIcon className="size-3 animate-spin" /> : <BellIcon className="size-3" />}
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(truck)}>
                                  Update
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {allRows.map((truck) => {
                  const status = getStatusLabel(truck.epass_expiry_date)
                  const days = truck.epass_expiry_date ? getDaysRemaining(truck.epass_expiry_date) : null
                  const lastSent = reminders[truck.id]
                  const isExpiringOrExpired = truck.epass_expiry_date && getDaysRemaining(truck.epass_expiry_date) <= 7
                  const isSending = sendingIds.has(truck.id)

                  return (
                    <div
                      key={truck.id}
                      className={`rounded-lg border bg-white p-4 text-sm ${
                        status.label === "Expired" ? "border-red-200" : status.label === "Critical" ? "border-red-200" : status.label === "Expiring Soon" ? "border-yellow-200" : ""
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-base">{truck.truck_number}</span>
                        <Badge variant={status.color === "destructive" ? "destructive" : "secondary"}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>E-Pass:</span>
                          <span className="text-foreground">{truck.epass_number ?? "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expiry:</span>
                          <span className={
                            days !== null && days <= 0 ? "text-red-600 font-medium" : days !== null && days <= 3 ? "text-red-600 font-medium" : days !== null && days <= 7 ? "text-yellow-600 font-medium" : "text-foreground"
                          }>
                            {truck.epass_expiry_date ? format(new Date(truck.epass_expiry_date), "dd MMM yyyy") : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Days Left:</span>
                          <span className={
                            days !== null && days <= 0 ? "text-red-600 font-bold" : days !== null && days <= 3 ? "text-red-600 font-semibold" : days !== null && days <= 7 ? "text-yellow-600 font-semibold" : "text-green-600"
                          }>
                            {days !== null ? (days <= 0 ? "Expired" : `${days}d`) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Reminder:</span>
                          <span className="text-foreground">{lastSent ? format(new Date(lastSent), "dd MMM") : "Never"}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {isExpiringOrExpired && (
                          <Button variant="outline" size="sm" className="min-h-[40px] flex-1" disabled={isSending} onClick={() => sendReminder(truck.id)}>
                            {isSending ? <RefreshCwIcon className="size-4 animate-spin" /> : <BellIcon className="size-4" />}
                            Send
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="min-h-[40px] flex-1" onClick={() => openEditDialog(truck)}>
                          Update
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Update E-Pass Dialog — mobile bottom sheet */}
      <Dialog open={!!editTruck} onOpenChange={(o) => !o && setEditTruck(null)}>
        <div className="mobile-bottom-sheet">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update E-Pass — {editTruck?.truck_number}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateEpass} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="epass_number">E-Pass Number</Label>
                <Input
                  id="epass_number"
                  placeholder="e.g. EP123456"
                  value={editForm.epass_number}
                  onChange={(e) => setEditForm({ ...editForm, epass_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="epass_expiry_date">New Expiry Date</Label>
                <Input
                  id="epass_expiry_date"
                  type="date"
                  value={editForm.epass_expiry_date}
                  onChange={(e) => setEditForm({ ...editForm, epass_expiry_date: e.target.value })}
                />
              </div>
              <DialogFooter showCloseButton>
                <Button type="submit" disabled={saving} className="min-h-[48px]">
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </div>
      </Dialog>
    </div>
  )
}
