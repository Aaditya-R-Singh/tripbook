"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { PencilIcon, PlusIcon, PowerIcon, PowerOffIcon, SearchIcon, Loader2, RefreshCw, Truck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type Truck = {
  id: string
  truck_number: string
  epass_number: string | null
  epass_expiry_date: string | null
  is_active: boolean
}

type FormData = {
  truck_number: string
  epass_number: string
  epass_expiry_date: string
}

const emptyForm: FormData = {
  truck_number: "",
  epass_number: "",
  epass_expiry_date: "",
}

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)

  async function fetchTrucks() {
    setError(null)
    try {
      const { data, error } = await supabase
        .from("trucks")
        .select("id, truck_number, epass_number, epass_expiry_date, is_active")
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      setTrucks(data as unknown as Truck[])
    } catch (err) {
      console.error("Trucks fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to load trucks")
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOwnerId(data.session?.user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      await fetchTrucks()
      setLoading(false)
    }
    load()
  }, [])

  function openAddDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(truck: Truck) {
    setEditingId(truck.id)
    setForm({
      truck_number: truck.truck_number,
      epass_number: truck.epass_number ?? "",
      epass_expiry_date: truck.epass_expiry_date ?? "",
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.truck_number.trim()) {
      toast.error("Truck number is required")
      return
    }

    setSaving(true)
    const payload = {
      truck_number: form.truck_number.trim(),
      epass_number: form.epass_number.trim() || null,
      epass_expiry_date: form.epass_expiry_date || null,
    }

    if (editingId) {
      const { error } = await supabase
        .from("trucks")
        .update(payload)
        .eq("id", editingId)

      if (error) {
        toast.error(error.message)
        setSaving(false)
        return
      }
      toast.success("Saved! ✅")
    } else {
      const { error } = await supabase
        .from("trucks")
        .insert({ ...payload, owner_id: ownerId })

      if (error) {
        toast.error(error.message)
        setSaving(false)
        return
      }
      toast.success("Saved! ✅")
    }

    setSaving(false)
    setDialogOpen(false)
    await fetchTrucks()
  }

  async function toggleStatus(truck: Truck) {
    const { error } = await supabase
      .from("trucks")
      .update({ is_active: !truck.is_active })
      .eq("id", truck.id)

    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(truck.is_active ? "Truck deactivated" : "Truck activated")
    await fetchTrucks()
  }

  function getDaysRemaining(dateStr: string): number | null {
    if (!dateStr) return null
    const now = new Date()
    const expiry = new Date(dateStr)
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  function getExpiryColor(days: number | null): string {
    if (days === null) return ""
    if (days <= 0) return "text-red-600 font-semibold"
    if (days <= 3) return "text-red-600 font-semibold"
    if (days <= 7) return "text-yellow-600 font-semibold"
    return "text-green-600 font-semibold"
  }

  const filtered = trucks.filter((t) =>
    t.truck_number.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Trucks</h1>
        <Button onClick={openAddDialog} className="min-h-[48px]">
          <PlusIcon />
          Add Truck
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>All Trucks</CardTitle>
            <div className="relative w-full md:w-64">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by truck number..."
                className="h-12 w-full pl-8 md:h-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
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
              <Button variant="outline" size="sm" className="min-h-[40px]" onClick={() => { setLoading(true); fetchTrucks().finally(() => setLoading(false)) }}>
                <RefreshCw className="size-4" />
                Try Again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <Truck className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {trucks.length === 0 ? "No trucks yet" : "No trucks match your search"}
              </p>
              {trucks.length === 0 && (
                <Button variant="outline" size="sm" className="min-h-[40px]" onClick={openAddDialog}>
                  <PlusIcon className="size-4" />
                  Add your first truck
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Truck Number</TableHead>
                      <TableHead>E-Pass Number</TableHead>
                      <TableHead>E-Pass Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((truck) => {
                      const days = getDaysRemaining(truck.epass_expiry_date ?? "")
                      return (
                        <TableRow key={truck.id}>
                          <TableCell className="font-medium">{truck.truck_number}</TableCell>
                          <TableCell>{truck.epass_number ?? "—"}</TableCell>
                          <TableCell>
                            {truck.epass_expiry_date ? (
                              <span className={getExpiryColor(days)}>
                                {format(new Date(truck.epass_expiry_date), "dd MMM yyyy")}
                                {days !== null && days > 0 && ` (${days}d)`}
                                {days !== null && days <= 0 && " (expired)"}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={truck.is_active ? "text-green-600 font-medium" : "text-muted-foreground"}>
                              {truck.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(truck)}>
                                <PencilIcon />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => toggleStatus(truck)}>
                                {truck.is_active ? <PowerOffIcon /> : <PowerIcon />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((truck) => {
                  const days = getDaysRemaining(truck.epass_expiry_date ?? "")
                  return (
                    <div key={truck.id} className="rounded-lg border bg-white p-4 text-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-base">{truck.truck_number}</span>
                        <span className={truck.is_active ? "text-green-600 font-medium" : "text-muted-foreground"}>
                          {truck.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>E-Pass:</span>
                          <span className="text-foreground">{truck.epass_number ?? "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expiry:</span>
                          <span className={getExpiryColor(days)}>
                            {truck.epass_expiry_date ? (
                              <>{format(new Date(truck.epass_expiry_date), "dd MMM yyyy")}{days !== null && days > 0 && ` (${days}d)`}{days !== null && days <= 0 && " (expired)"}</>
                            ) : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="min-h-[40px] flex-1" onClick={() => openEditDialog(truck)}>
                          <PencilIcon className="size-4" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-[40px] flex-1" onClick={() => toggleStatus(truck)}>
                          {truck.is_active ? <><PowerOffIcon className="size-4" /> Deactivate</> : <><PowerIcon className="size-4" /> Activate</>}
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

      {/* Add/Edit Truck Dialog — mobile bottom sheet */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="mobile-bottom-sheet">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Truck" : "Add Truck"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="truck_number">Truck Number *</Label>
                <Input
                  id="truck_number"
                  placeholder="e.g. MH31AB1234"
                  value={form.truck_number}
                  onChange={(e) => setForm({ ...form, truck_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="epass_number">E-Pass Number</Label>
                <Input
                  id="epass_number"
                  placeholder="e.g. EP123456"
                  value={form.epass_number}
                  onChange={(e) => setForm({ ...form, epass_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="epass_expiry_date">E-Pass Expiry Date</Label>
                <Input
                  id="epass_expiry_date"
                  type="date"
                  value={form.epass_expiry_date}
                  onChange={(e) => setForm({ ...form, epass_expiry_date: e.target.value })}
                />
              </div>
              <DialogFooter showCloseButton>
                <Button type="submit" disabled={saving} className="min-h-[48px]">
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? "Saving..." : editingId ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </div>
      </Dialog>
    </div>
  )
}
