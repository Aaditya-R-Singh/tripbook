"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createOwner, register } from "@/app/actions/onboarding"
import { getSupabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Eye, EyeOff, Loader2 } from "lucide-react"

const initialState = { error: null as string | null }

export default function OnboardingPage() {
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-blue-600">TripBook</h1>
            <p className="text-lg text-gray-500">प्रोफ़ाइल सेटअप</p>
          </div>
          <form action={setupAction} className="space-y-6 rounded-2xl bg-white p-8 shadow-lg">
            <div className="text-left">
              <label className="text-lg font-medium text-gray-700">आपका नाम</label>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                disabled={setupPending}
                required
              />
            </div>
            <div className="text-left">
              <label className="text-lg font-medium text-gray-700">व्यवसाय का नाम</label>
              <input
                type="text"
                name="businessName"
                placeholder="Business Name (optional)"
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                disabled={setupPending}
              />
            </div>
            <button
              type="submit"
              disabled={setupPending}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 min-h-[48px]"
            >
              {setupPending ? "बना रहे हैं..." : "खाता बनाएं"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-blue-600">TripBook</h1>
          <p className="text-lg text-gray-500">नया खाता बनाएं</p>
        </div>
        <form action={registerAction} className="space-y-6 rounded-2xl bg-white p-8 shadow-lg">
          <div className="text-left">
            <label className="text-lg font-medium text-gray-700">फ़ोन नंबर</label>
            <div className="mt-2 flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-4 text-lg text-gray-500">+91</span>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                className="block w-full rounded-r-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                disabled={registerPending}
                required
              />
            </div>
          </div>
          <div className="text-left">
            <label className="text-lg font-medium text-gray-700">पासवर्ड</label>
            <div className="mt-2 relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-lg focus:border-blue-500 focus:outline-none"
                disabled={registerPending}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>
          <div className="text-left">
            <label className="text-lg font-medium text-gray-700">आपका नाम</label>
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
              disabled={registerPending}
              required
            />
          </div>
          <div className="text-left">
            <label className="text-lg font-medium text-gray-700">व्यवसाय का नाम</label>
            <input
              type="text"
              name="businessName"
              placeholder="Business Name (optional)"
              className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
              disabled={registerPending}
            />
          </div>
          <button
            type="submit"
            disabled={registerPending}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 min-h-[48px]"
          >
            {registerPending ? "बना रहे हैं..." : "खाता बनाएं"}
          </button>
          <p className="text-sm text-gray-500">
            पहले से खाता है?{" "}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-blue-600 hover:underline font-medium"
            >
              लॉगिन करें
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
