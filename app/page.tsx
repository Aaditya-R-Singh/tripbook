"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Eye, EyeOff, Truck, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accountDeleted, setAccountDeleted] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "account_deleted") {
      setAccountDeleted(true)
    }
  }, [])

  const handleLogin = async () => {
    if (phone.length !== 10) {
      toast.error("सही फ़ोन नंबर डालें (10 अंक)")
      return
    }
    if (!password) {
      toast.error("पासवर्ड डालें")
      return
    }

    setLoading(true)
    const email = `${phone}@tripbook.app`
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoading(false)
      toast.error("फ़ोन नंबर या पासवर्ड गलत है")
      return
    }

    // Session is cached locally — no network call
    const { data: { session } } = await supabase.auth.getSession()
    const metadata = session?.user?.user_metadata

    // If metadata has phone, owner record was created during onboarding
    if (metadata?.phone) {
      setLoading(false)
      toast.success("लॉगिन सफल!")
      router.push("/dashboard")
      return
    }

    // Fallback: edge case where metadata wasn't set — query owners table
    const { data: owners } = await supabase
      .from("owners")
      .select("id")
      .eq("phone", phone)

    setLoading(false)

    if (owners && owners.length > 0) {
      toast.success("लॉगिन सफल!")
      router.push("/dashboard")
    } else {
      router.push("/onboarding?phone=" + phone)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center animate-fade-in-up">
        {/* Logo Section */}
        <div className="space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-premium-lg">
            <Truck className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              TripBook
            </h1>
            <p className="mt-1 text-sm text-gold-600">
              Truck ka hisaab, WhatsApp pe
            </p>
          </div>
        </div>

        {/* Account Deleted Alert */}
        {accountDeleted && (
          <div className="animate-slide-down rounded-2xl border border-red-200 bg-red-50 p-4 text-left shadow-premium-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Account Deleted</p>
                <p className="mt-1 text-sm text-red-700">
                  Yeh account delete ho gaya hai. Naya account banao ya admin se contact karo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-premium-card animate-scale-in">
          <div className="space-y-5">
            {/* Phone Number */}
            <div className="text-left">
              <label className="text-sm font-medium text-foreground">
                फ़ोन नंबर
              </label>
              <div className="mt-1.5 flex">
                <span className="inline-flex items-center rounded-l-xl border border-r-0 border-border bg-muted px-4 text-sm text-muted-foreground">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="9876543210"
                  className="block w-full rounded-r-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="text-left">
              <label className="text-sm font-medium text-foreground">
                पासवर्ड
              </label>
              <div className="mt-1.5 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="block w-full rounded-xl border border-border px-4 py-2.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-11 text-base font-semibold"
              size="lg"
            >
              {loading ? "लॉगिन कर रहे हैं..." : "लॉगिन"}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  पहली बार?
                </span>
              </div>
            </div>

            {/* Register Button */}
            <button
              onClick={() => router.push("/onboarding")}
              className="w-full rounded-xl border border-gold-300 px-6 py-2.5 text-sm font-medium text-gold-600 hover:bg-gold-50 transition-colors"
            >
              नया खाता बनाएं
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          &copy; 2026 TripBook
        </p>
      </div>
    </div>
  )
}
