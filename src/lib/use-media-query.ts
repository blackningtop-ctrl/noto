import { useEffect, useState } from 'react'

/** Subscribe to a CSS media query (e.g. `(max-width: 767px)`). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Phone / small tablet portrait — drawer nav instead of fixed sidebar. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
