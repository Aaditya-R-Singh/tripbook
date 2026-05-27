"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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
    setLoading(false)

    if (error) {
      toast.error("फ़ोन नंबर या पासवर्ड गलत है")
      return
    }

    toast.success("लॉगिन सफल!")

    const { data: owners } = await supabase
      .from("owners")
      .select("id")
      .eq("phone", phone)

    if (owners && owners.length > 0) {
      router.push("/dashboard")
    } else {
      router.push("/onboarding?phone=" + phone)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-blue-600">
            TripBook
          </h1>
          <p className="text-xl text-gray-500">
            Truck ka hisaab, WhatsApp pe
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="space-y-6">
            <div className="text-left">
              <label className="text-lg font-medium text-gray-700">
                फ़ोन नंबर
              </label>
              <div className="mt-2 flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-4 text-lg text-gray-500">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="9876543210"
                  className="block w-full rounded-r-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="text-left">
              <label className="text-lg font-medium text-gray-700">
                पासवर्ड
              </label>
              <div className="mt-2 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-lg focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 min-h-[48px]"
            >
              {loading ? "लॉगिन कर रहे हैं..." : "लॉगिन"}
            </button>

            <p className="text-sm text-gray-500">
              पहली बार?{" "}
              <button
                onClick={() => router.push("/onboarding")}
                className="text-blue-600 hover:underline font-medium"
              >
                नया खाता बनाएं
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
