import * as React from "react"

/**
 * Custom hook for tracking the state of a media query.
 * @param query The media query string to track (e.g., "(min-width: 768px)").
 * @returns `true` if the media query matches, `false` otherwise.
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 768px)")
 */
export function useMediaQuery(query: string): boolean {
  const [value, setValue] = React.useState<boolean>(false)

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches)
    }

    // Check if window is defined (for SSR compatibility)
    if (typeof window === "undefined") {
      return;
    }

    const result = window.matchMedia(query)
    result.addEventListener("change", onChange)
    setValue(result.matches)

    return () => result.removeEventListener("change", onChange)
  }, [query])

  return value
}
