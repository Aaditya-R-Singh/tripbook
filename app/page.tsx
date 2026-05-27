"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Eye, EyeOff, Truck, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const supabase = getSupabase()
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [mode, setMode] = useState<"login" | "register" | "setup">("login")

  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accountDeleted, setAccountDeleted] = useState(false)

  const [setupName, setSetupName] = useState("")
  const [setupBusiness, setSetupBusiness] = useState("")
  const [setupCity, setSetupCity] = useState("")
  const [setupLoading, setSetupLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "account_deleted") {
      setAccountDeleted(true)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: { data: { session: { user: { id: string } | null } | null } | null }) => {
      if (data?.session?.user?.id) {
        const { data: owner } = await supabase
          .from("owners")
          .select("id")
          .eq("id", data.session.user.id)
          .maybeSingle()

        if (owner) {
          router.push("/dashboard")
        } else {
          setMode("setup")
        }
      }
      setChecking(false)
    })
  }, [])

  const handleLogin = async () => {
    if (phone.length !== 10) { toast.error("सही फ़ोन नंबर डालें (10 अंक)"); return }
    if (!password) { toast.error("पासवर्ड डालें"); return }

    setLoading(true)
    const email = `${phone}@tripbook.app`
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoading(false)
      toast.error("फ़ोन नंबर या पासवर्ड गलत है")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const metadata = session?.user?.user_metadata

    if (metadata?.phone) {
      setLoading(false)
      toast.success("लॉगिन सफल!")
      router.push("/dashboard")
      return
    }

    const { data: owners } = await supabase
      .from("owners")
      .select("id")
      .eq("phone", phone)

    setLoading(false)

    if (owners && owners.length > 0) {
      toast.success("लॉगिन सफल!")
      router.push("/dashboard")
    } else {
      setMode("setup")
    }
  }

  const handleRegister = async () => {
    const name = (document.getElementById("reg-name") as HTMLInputElement)?.value
    const businessName = (document.getElementById("reg-business") as HTMLInputElement)?.value
    const city = (document.getElementById("reg-city") as HTMLInputElement)?.value

    if (phone.length !== 10) { toast.error("सही फ़ोन नंबर डालें (10 अंक)"); return }
    if (!password || password.length < 6) { toast.error("कम से कम 6 अंक का पासवर्ड डालें"); return }
    if (!name?.trim()) { toast.error("अपना नाम डालें"); return }

    setLoading(true)
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password, name: name.trim(), businessName: businessName?.trim(), city: city?.trim() }),
    })

    const data = await res.json()
    if (!res.ok) {
      setLoading(false)
      toast.error(data.error)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    })

    setLoading(false)
    if (signInError) {
      toast.error(signInError.message)
      return
    }

    toast.success("खाता बन गया!")
    router.push("/dashboard")
  }

  const handleSetup = async () => {
    if (!setupName.trim()) { toast.error("अपना नाम डालें"); return }

    setSetupLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setSetupLoading(false)
      toast.error("Session expired, please login again")
      return
    }

    const res = await fetch("/api/create-owner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: setupName.trim(), businessName: setupBusiness.trim(), city: setupCity.trim() }),
    })

    const data = await res.json()
    setSetupLoading(false)

    if (!res.ok) {
      toast.error(data.error)
      return
    }

    toast.success("सेटअप पूरा!")
    router.push("/dashboard")
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (mode === "setup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center animate-fade-in-up">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-premium-lg">
            <Truck className="size-7 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">TripBook</h1>
            <p className="text-sm text-muted-foreground">Apna account setup karo 🚛</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-premium-card animate-scale-in">
            <div className="space-y-4">
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Your Full Name</label>
                <input type="text" value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="Your Name" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={setupLoading} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Business Name</label>
                <input type="text" value={setupBusiness} onChange={(e) => setSetupBusiness(e.target.value)} placeholder="Example: Raju Transport" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={setupLoading} />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">City</label>
                <input type="text" value={setupCity} onChange={(e) => setSetupCity(e.target.value)} placeholder="Example: Chandrapur" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={setupLoading} />
              </div>
              <Button onClick={handleSetup} disabled={setupLoading} className="w-full h-11 text-base font-semibold">
                {setupLoading ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : "Shuru Karo →"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center animate-fade-in-up">
        <div className="space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-premium-lg">
            <Truck className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">TripBook</h1>
            <p className="mt-1 text-sm text-gold-600">Truck ka hisaab, WhatsApp pe</p>
          </div>
        </div>

        {accountDeleted && (
          <div className="animate-slide-down rounded-2xl border border-red-200 bg-red-50 p-4 text-left shadow-premium-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Account Deleted</p>
                <p className="mt-1 text-sm text-red-700">Yeh account delete ho gaya hai. Naya account banao ya admin se contact karo.</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white p-8 shadow-premium-card animate-scale-in">
          {mode === "login" ? (
            <div className="space-y-5">
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">फ़ोन नंबर</label>
                <div className="mt-1.5 flex">
                  <span className="inline-flex items-center rounded-l-xl border border-r-0 border-border bg-muted px-4 text-sm text-muted-foreground">+91</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" className="block w-full rounded-r-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={loading} />
                </div>
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">पासवर्ड</label>
                <div className="mt-1.5 relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="block w-full rounded-xl border border-border px-4 py-2.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={loading} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full h-11 text-base font-semibold" size="lg">
                {loading ? "लॉगिन कर रहे हैं..." : "लॉगिन"}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">पहली बार?</span>
                </div>
              </div>
              <button onClick={() => { setMode("register"); setPhone(""); setPassword("") }} className="w-full rounded-xl border border-gold-300 px-6 py-2.5 text-sm font-medium text-gold-600 hover:bg-gold-50 transition-colors">
                नया खाता बनाएं
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">फ़ोन नंबर</label>
                <div className="mt-1.5 flex">
                  <span className="inline-flex items-center rounded-l-xl border border-r-0 border-border bg-muted px-4 text-sm text-muted-foreground">+91</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" className="block w-full rounded-r-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={loading} />
                </div>
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">पासवर्ड</label>
                <div className="mt-1.5 relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" className="block w-full rounded-xl border border-border px-4 py-2.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={loading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Your Full Name</label>
                <input id="reg-name" type="text" placeholder="Your Name" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={loading} />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Business Name</label>
                <input id="reg-business" type="text" placeholder="Example: Raju Transport" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={loading} />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">City</label>
                <input id="reg-city" type="text" placeholder="Example: Chandrapur" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={loading} />
              </div>
              <Button onClick={handleRegister} disabled={loading} className="w-full h-11 text-base font-semibold" size="lg">
                {loading ? <><Loader2 className="size-4 animate-spin" /> बना रहे हैं...</> : "Shuru Karo →"}
              </Button>
              <p className="text-xs text-muted-foreground">
                पहले से खाता है?{" "}
                <button onClick={() => setMode("login")} className="text-orange-600 hover:underline font-medium">
                  लॉगिन करें
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">&copy; 2026 TripBook</p>
      </div>
    </div>
  )
}
