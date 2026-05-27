"use client"

import { Suspense, useActionState, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createOwner, register } from "@/app/actions/onboarding"
import { getSupabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Eye, EyeOff, Loader2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"

const initialState = { error: null as string | null }

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  )
}

function OnboardingForm() {
  const supabase = getSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledPhone = searchParams.get("phone") || ""

  const [session, setSession] = useState<boolean | null>(null)
  const [phone, setPhone] = useState(prefilledPhone)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [setupState, setupAction, setupPending] = useActionState(createOwner, initialState)
  const [registerState, registerAction, registerPending] = useActionState(register, initialState)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } | null }) => {
      setSession(!!data?.session)
    })
  }, [])

  useEffect(() => {
    if (setupState?.error) toast.error(setupState.error)
  }, [setupState?.error])

  useEffect(() => {
    if (registerState?.error) toast.error(registerState.error)
  }, [registerState?.error])

  if (session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 text-center animate-fade-in-up">
          <div className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-premium-lg">
              <Truck className="size-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">TripBook</h1>
              <p className="mt-1 text-sm text-gold-600">प्रोफ़ाइल सेटअप</p>
            </div>
          </div>
          <form action={setupAction} className="space-y-5 rounded-2xl bg-white p-8 shadow-premium-card animate-scale-in">
            <div className="text-left">
              <label className="text-sm font-medium text-foreground">आपका नाम</label>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                disabled={setupPending}
                required
              />
            </div>
            <div className="text-left">
              <label className="text-sm font-medium text-foreground">व्यवसाय का नाम</label>
              <input
                type="text"
                name="businessName"
                placeholder="Business Name (optional)"
                className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                disabled={setupPending}
              />
            </div>
            <Button type="submit" disabled={setupPending} className="w-full h-11 text-base font-semibold" size="lg">
              {setupPending ? "बना रहे हैं..." : "खाता बनाएं"}
            </Button>
          </form>
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
            <p className="mt-1 text-sm text-gold-600">नया खाता बनाएं</p>
          </div>
        </div>
        <form action={registerAction} className="space-y-5 rounded-2xl bg-white p-8 shadow-premium-card animate-scale-in">
          <div className="text-left">
            <label className="text-sm font-medium text-foreground">फ़ोन नंबर</label>
            <div className="mt-1.5 flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-border bg-muted px-4 text-sm text-muted-foreground">+91</span>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                className="block w-full rounded-r-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                disabled={registerPending}
                required
              />
            </div>
          </div>
          <div className="text-left">
            <label className="text-sm font-medium text-foreground">पासवर्ड</label>
            <div className="mt-1.5 relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="block w-full rounded-xl border border-border px-4 py-2.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                disabled={registerPending}
                required
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
          <div className="text-left">
            <label className="text-sm font-medium text-foreground">आपका नाम</label>
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
              disabled={registerPending}
              required
            />
          </div>
          <div className="text-left">
            <label className="text-sm font-medium text-foreground">व्यवसाय का नाम</label>
            <input
              type="text"
              name="businessName"
              placeholder="Business Name (optional)"
              className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
              disabled={registerPending}
            />
          </div>
          <Button type="submit" disabled={registerPending} className="w-full h-11 text-base font-semibold" size="lg">
            {registerPending ? "बना रहे हैं..." : "खाता बनाएं"}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                पहले से खाता है?
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded-xl border border-gold-300 px-6 py-2.5 text-sm font-medium text-gold-600 hover:bg-gold-50 transition-colors"
          >
            लॉगिन करें
          </button>
        </form>
      </div>
    </div>
  )
}
