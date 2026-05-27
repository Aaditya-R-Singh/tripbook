"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  User,
  Building2,
  Phone,
  Calendar,
  LogOut,
  Loader2,
  ExternalLink,
  Smartphone,
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import toast from "react-hot-toast"

type OwnerData = {
  name: string
  business_name: string | null
  phone: string
  created_at: string
}

export default function SettingsPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [owner, setOwner] = useState<OwnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push("/")
        return
      }

      const { data } = await supabase
        .from("owners")
        .select("name, business_name, phone, created_at")
        .eq("id", session.user.id)
        .maybeSingle()

      if (data) setOwner(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
      setLoggingOut(false)
    } else {
      router.push("/")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const initial = owner?.name?.charAt(0)?.toUpperCase() || "?"

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 animate-fade-in-up">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-gradient-brand text-2xl font-bold text-white shadow-premium-md">
              {initial}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{owner?.name || "—"}</p>
              {owner?.business_name && (
                <p className="text-sm text-muted-foreground">{owner.business_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="size-4 shrink-0 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium text-foreground">{owner?.name || "—"}</p>
              </div>
            </div>

            {owner?.business_name && (
              <div className="flex items-center gap-3">
                <Building2 className="size-4 shrink-0 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Business Name</p>
                  <p className="text-sm font-medium text-foreground">{owner.business_name}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Phone className="size-4 shrink-0 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp Number</p>
                <p className="text-sm font-medium text-foreground">+91 {owner?.phone || "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="size-4 shrink-0 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium text-foreground">
                  {owner?.created_at
                    ? format(new Date(owner.created_at), "MMMM yyyy")
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Smartphone className="size-4 shrink-0 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">App Version</p>
              <p className="text-sm font-medium text-foreground">v1.0.0</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="size-4 shrink-0 text-orange-500" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Support</p>
              <a
                href={`https://wa.me/91${owner?.phone || "XXXXXXXXXX"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                WhatsApp Support
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout Section */}
      <Dialog>
        <DialogTrigger
          render={
            <Button
              variant="destructive"
              className="w-full h-12 text-base font-semibold gap-2"
            />
          }
        >
          <LogOut className="size-5" />
          लॉग आउट
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>लॉग आउट करें</DialogTitle>
            <DialogDescription>
              Kya aap logout karna chahte hain?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogTrigger
              render={<Button variant="outline" disabled={loggingOut} />}
            >
              Ruko
            </DialogTrigger>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
              className="gap-2"
            >
              {loggingOut && <Loader2 className="size-4 animate-spin" />}
              Haan, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
