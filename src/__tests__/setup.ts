import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no IntersectionObserver (framer-motion's scroll-in animations use it)
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } }
;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO

afterEach(() => cleanup())
