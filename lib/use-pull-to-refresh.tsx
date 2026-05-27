"use client"

import { useState, useRef, useCallback } from "react"

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pulling = useRef(false)

  const threshold = 80

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return
    const dist = e.touches[0].clientY - startY.current
    if (dist > 0) {
      setPullDistance(Math.min(dist * 0.5, threshold * 1.5))
    }
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false
    if (pullDistance >= threshold) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPullDistance(0)
  }, [pullDistance, onRefresh])

  const indicator = pullDistance > 0 || refreshing ? (
    <div
      className="pull-to-refresh-indicator"
      style={{
        opacity: Math.min(pullDistance / threshold, 1),
        height: refreshing ? 48 : Math.min(pullDistance, threshold),
        overflow: "hidden",
      }}
    >
      {refreshing ? (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : pullDistance >= threshold ? (
        <span>छोड़ें ताज़ा करने के लिए</span>
      ) : (
        <span>नीचे खींचें ताज़ा करने के लिए</span>
      )}
    </div>
  ) : null

  return {
    refreshing,
    pullDistance,
    indicator,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}
