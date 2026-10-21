import { vi } from 'vitest'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { UIProvider } from '../components/ui'

export const apiMock = {
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
  defaults: { baseURL: 'http://test/api' },
}
export const ok = <T,>(data: T) => Promise.resolve({ data })

export function Providers({ children, route = '/' }: { children: ReactNode; route?: string }) {
  return <MemoryRouter initialEntries={[route]}><UIProvider>{children}</UIProvider></MemoryRouter>
}
