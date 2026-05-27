"use client"

import { useSyncExternalStore } from "react"

function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (online) return null

  return (
    <div className="sticky top-0 z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-yellow-950">
      Internet nahi hai — changes save nahi honge
    </div>
  )
}
