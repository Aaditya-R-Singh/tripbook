"use client"

import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Truck,
  Route,
  ShieldCheck,
  Wallet,
  Settings,
  Plus,
  LogOut,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

const navItems = [
  { label: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Trucks", icon: Truck, href: "/dashboard/trucks" },
  { label: "Trips", icon: Route, href: "/dashboard/trips" },
  { label: "E-Pass", icon: ShieldCheck, href: "/dashboard/epass" },
  { label: "Payments", icon: Wallet, href: "/dashboard/payments" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
    } else {
      router.push("/")
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:z-40">
        <div className="flex flex-1 flex-col bg-slate-950">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-white/5 px-6">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-brand shadow-lg">
              <Route className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">TripBook</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-orange-500/10 text-orange-400 shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`size-4 shrink-0 transition-all ${
                    isActive ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300"
                  }`} />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-white/5 p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="size-4 shrink-0 text-slate-500 group-hover:text-red-400" />
              लॉग आउट
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col md:ml-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-white/80 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-brand shadow">
              <Route className="size-3.5 text-white" />
            </div>
            <h1 className="text-base font-bold text-slate-900">TripBook</h1>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-white/90 backdrop-blur-xl md:hidden safe-area-bottom">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-all ${
                    isActive
                      ? "text-orange-500"
                      : "text-slate-400"
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-orange-500" />
                  )}
                  <Icon className={`size-5 ${isActive ? "drop-shadow-sm" : ""}`} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Mobile FAB for quick trip entry */}
      <button
        onClick={() => router.push("/dashboard/trips")}
        className="fixed bottom-20 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-orange-500/25 transition-all active:scale-90 hover:shadow-xl hover:shadow-orange-500/30 md:hidden"
        aria-label="Add Trip"
      >
        <Plus className="size-6" />
      </button>
    </div>
  )
}
