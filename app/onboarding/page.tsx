"use client"

import { useEffect, useState, Suspense, useActionState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createOwner, register } from "@/app/actions/onboarding"
import { getSupabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Loader2, Truck, Eye, EyeOff } from "lucide-react"

type SetupState = { error: string }
type RegisterState = { error?: string; success?: boolean; email?: string; password?: string }

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

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [setupState, setupAction, setupPending] = useActionState(createOwner, {} as SetupState)

  const [phone, setPhone] = useState(prefilledPhone)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [registerState, registerAction, registerPending] = useActionState(register, {} as RegisterState)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: { user: { id: string } | null } | null } | null }) => {
      setHasSession(!!data?.session)
      setUserId(data?.session?.user?.id ?? null)
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (setupState?.error) toast.error(setupState.error)
  }, [setupState?.error])

  useEffect(() => {
    if (registerState?.error) toast.error(registerState.error)
  }, [registerState?.error])

  useEffect(() => {
    if (registerState && "success" in registerState && registerState.success) {
      supabase.auth.signInWithPassword({
        email: registerState.email!,
        password: registerState.password!,
      }).then(({ error }: { error: { message: string } | null }) => {
        if (error) toast.error(error.message)
        else router.push("/dashboard")
      })
    }
  }, [registerState])

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
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-premium-lg">
          <Truck className="size-7 text-white" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">TripBook</h1>
          <p className="text-sm text-muted-foreground">
            {hasSession ? "Apna account setup karo 🚛" : "Naya account banao 🚛"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-premium-card animate-scale-in">
          {hasSession ? (
            <form action={setupAction} className="space-y-4">
              <input type="hidden" name="userId" value={userId ?? ""} />
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Your Full Name</label>
                <input type="text" name="name" placeholder="Your Name" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={setupPending} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Business Name</label>
                <input type="text" name="businessName" placeholder="Example: Raju Transport" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={setupPending} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">City</label>
                <input type="text" name="city" placeholder="Example: Chandrapur" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={setupPending} required />
              </div>
              <button type="submit" disabled={setupPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
                {setupPending ? <Loader2 className="size-4 animate-spin" /> : "Shuru Karo →"}
              </button>
            </form>
          ) : (
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
                <input type="text" name="name" placeholder="Your Name" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={registerPending} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">Business Name</label>
                <input type="text" name="businessName" placeholder="Example: Raju Transport" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={registerPending} required />
              </div>
              <div className="text-left">
                <label className="text-sm font-medium text-foreground">City</label>
                <input type="text" name="city" placeholder="Example: Chandrapur" className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10" disabled={registerPending} required />
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
