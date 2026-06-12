import { useState, useEffect } from 'react'

// One source of truth for the desktop/mobile switch (GROVE-ALPHA-BUILD-GUIDE §6).
// Promoted from apps/almanac/useViewport.js — use this everywhere, never fork it.
export function useIsDesktop(breakpoint = 720) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= breakpoint
  )
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const onChange = (e) => setIsDesktop(e.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [breakpoint])
  return isDesktop
}
