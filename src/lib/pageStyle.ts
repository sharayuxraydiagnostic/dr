import { useEffect } from 'react'

/** Adds a <style> to the page while a component is mounted (used to set the print page size/margins for one screen only). */
export function usePageStyle(css: string) {
  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-munot-page-style', '')
    el.textContent = css
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [css])
}
