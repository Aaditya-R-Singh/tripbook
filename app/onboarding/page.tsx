"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { register } from "@/app/actions/onboarding"
import { getSupabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Loader2, Truck, Eye, EyeOff } from "lucide-react"
import { useActionState } from "react"

const initialState = { error: null as string | null }

export default function OnboardingPage() {
  const supabase = getSupabase()
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  // Setup form (authenticated)
  const [name, setName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [city, setCity] = useState("")
  const [saving, setSaving] = useState(false)

  // Register form (unauthenticated)
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [regName, setRegName] = useState("")
  const [regBusiness, setRegBusiness] = useState("")
  const [regCity, setRegCity] = useState("")
  const [registerState, registerAction, registerPending] = useActionState(register, initialState)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } | null }) => {
      setHasSession(!!data?.session)
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (registerState?.error) toast.error(registerState.error)
  }, [registerState?.error])

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !businessName.trim() || !city.trim()) {
      toast.error("Kripya saare fields bharein")
      return
    }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.email) {
      toast.error("Session nahi mila, phir se login karein")
      setSaving(false)
      return
    }
    const userPhone = session.user.email.split("@")[0]
    const { error } = await supabase.from("owners").insert({
      name: name.trim(),
      business_name: businessName.trim(),
      city: city.trim(),
      phone: userPhone,
    })
    setSaving(false)
    if (error) {
      toast.error("Kuch gadbad hui, dobara try karo")
      return
    }
    router.push("/dashboard")
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 text-center animate-fade-in-up">
        {/* Logo */}
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-premium-lg">
          <Truck className="size-7 text-white" />
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            TripBook
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasSession ? "Apna account setup karo 🚛" : "Naya account banao 🚛"}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-white p-6 shadow-premium-card animate-scale-in">
          {hasSession ? (
            /* Setup form — user already authenticated */
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Your Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={saving} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Business Name</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Example: Raju Transport" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={saving} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Example: Chandrapur" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={saving} required />
              </div>
              <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Shuru Karo →"}
              </button>
            </form>
          ) : (
            /* Registration form — new user */
            <form action={registerAction} className="space-y-4">
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="mt-1.5 flex">
                  <span className="inline-flex items-center rounded-l-xl border border-r-0 border-border bg-muted px-4 text-sm text-muted-foreground">+91</span>
                  <input type="tel" name="phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" className="block w-full rounded-r-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={registerPending} required />
                </div>
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="mt-1.5 relative">
                  <input type={showPassword ? "text" : "password"} name="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" className="block w-full rounded-xl border border-border px-4 py-2.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={registerPending} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Your Full Name</label>
                <input type="text" name="name" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Your Name" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={registerPending} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Business Name</label>
                <input type="text" name="businessName" value={regBusiness} onChange={(e) => setRegBusiness(e.target.value)} placeholder="Example: Raju Transport" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={registerPending} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">City</label>
                <input type="text" name="city" value={regCity} onChange={(e) => setRegCity(e.target.value)} placeholder="Example: Chandrapur" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={registerPending} required />
              </div>
              <button type="submit" disabled={registerPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
                {registerPending ? <Loader2 className="size-4 animate-spin" /> : "Shuru Karo →"}
              </button>
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => router.push("/")} className="text-orange-600 hover:underline font-medium">
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
