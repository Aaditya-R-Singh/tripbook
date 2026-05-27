"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"

export default function SettingsPage() {
  const supabase = getSupabase()
  const router = useRouter()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
    } else {
      router.push("/")
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-xl font-semibold md:text-2xl">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleLogout}
            className="flex min-h-[48px] w-full items-center gap-3 rounded-lg px-4 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="size-5" />
            लॉग आउट
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
