"use client"

import { Toaster } from "react-hot-toast"
import { useEffect, useState } from "react"

export function ToasterProvider() {
  const [position, setPosition] = useState<"bottom-center" | "top-right">("bottom-center")

  useEffect(() => {
    function checkWidth() {
      setPosition(window.innerWidth >= 768 ? "top-right" : "bottom-center")
    }
    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [])

  return <Toaster position={position} />
}
