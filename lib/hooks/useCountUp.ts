'use client'

import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration = 750, decimals = 0) {
  const [val, setVal] = useState(target)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVal(target)
      return
    }
    const from = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const e = 1 - Math.pow(1 - p, 4)
      setVal(from + (target - from) * e)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  const factor = Math.pow(10, decimals)
  return Math.round(val * factor) / factor
}
