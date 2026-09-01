import { useEffect, useRef } from 'react'

export function usePolling(callback, intervalMs = 4000, enabled = true) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return undefined

    const tick = () => {
      callbackRef.current?.()
    }

    tick()
    const id = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(id)
  }, [enabled, intervalMs])
}
