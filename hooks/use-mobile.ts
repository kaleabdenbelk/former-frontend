import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

function getQuery() {
  return `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
}

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(getQuery())
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(getQuery()).matches,
    () => false,
  )
}
