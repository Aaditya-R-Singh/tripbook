"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Loader2, Truck } from "lucide-react"

export default function OnboardingPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [name, setName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [city, setCity] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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

    const phone = session.user.email.split("@")[0]

    const { error } = await supabase.from("owners").insert({
      name: name.trim(),
      business_name: businessName.trim(),
      city: city.trim(),
      phone,
    })

    setSaving(false)

    if (error) {
      toast.error("Kuch gadbad hui, dobara try karo")
      return
    }

    router.push("/dashboard")
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
            Swagat hai! Apna account setup karo 🚛
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-white p-6 shadow-premium-card animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-left">
              <label className="text-sm font-medium text-foreground">
                Your Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                disabled={saving}
                required
              />
            </div>

            <div className="text-left">
              <label className="text-sm font-medium text-foreground">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Example: Raju Transport"
                className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                disabled={saving}
                required
              />
            </div>

            <div className="text-left">
              <label className="text-sm font-medium text-foreground">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Example: Chandrapur"
                className="mt-1.5 block w-full rounded-xl border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
                disabled={saving}
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Shuru Karo →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
