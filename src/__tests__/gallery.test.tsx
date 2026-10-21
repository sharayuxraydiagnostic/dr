import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, errMsg: (e: { message?: string }) => e?.message ?? 'error', fetchBlobUrl: vi.fn(() => Promise.resolve({ url: 'blob:preview', type: 'image/jpeg' })), downloadFile: vi.fn(), openFile: vi.fn() }))
import { SiteProvider } from '../context/SiteContext'
import { DoctorSection, GallerySection } from '../pages/public/Sections'
import { AdminGallery } from '../pages/admin/AdminPages'

const photos = [
  { id: 1, caption: 'Reception', sortOrder: 1, active: true, version: 11 },
  { id: 2, caption: 'Consultation room', sortOrder: 2, active: true, version: 22 },
  { id: 3, sortOrder: 3, active: true, version: 33 },
]
const doctor = { id: 5, fullName: 'Dr Demo', specialization: 'Orthopaedics', consultationFee: 0, slotMinutes: 15, maxPatientsPerSlot: 1, active: true, hasPhoto: true, photoVersion: 99, bio: 'Bio text' }

function site(g = photos, doctors: unknown[] = []) {
  apiMock.get.mockImplementation((url: string) => ok(url === '/public/clinic-photos' ? g : url === '/public/doctors' ? doctors : url === '/public/settings' ? {} : []))
}
const reset = () => Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset())

describe('Clinic gallery on the public site', () => {
  beforeEach(reset)

  it('shows every active photo with its caption, loaded from the public image endpoint', async () => {
    site()
    render(<Providers><SiteProvider><GallerySection /></SiteProvider></Providers>)
    const img = await screen.findByAltText('Reception')
    expect(img).toHaveAttribute('src', 'http://test/api/public/clinic-photos/1/image?v=11')
    expect(screen.getByAltText('Consultation room')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(3)
  })

  it('enlarges a photo on click, moves with the arrows and closes with Escape', async () => {
    site()
    render(<Providers><SiteProvider><GallerySection /></SiteProvider></Providers>)
    await userEvent.click(await screen.findByRole('button', { name: /Enlarge photo: Consultation room/ }))
    const dlg = await screen.findByRole('dialog')
    expect(dlg.querySelector('img')).toHaveAttribute('alt', 'Consultation room')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute('alt', 'Clinic photo')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute('alt', 'Reception')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('renders nothing on the home page when there are no photos', async () => {
    site([])
    const { container } = render(<Providers><SiteProvider><GallerySection hideWhenEmpty /></SiteProvider></Providers>)
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/public/clinic-photos'))
    expect(container.querySelector('section')).toBeNull()
  })
})

describe('Doctor portrait', () => {
  beforeEach(reset)

  it('shows the uploaded doctor photo as a large portrait', async () => {
    site([], [doctor])
    render(<Providers><SiteProvider><DoctorSection /></SiteProvider></Providers>)
    const img = await screen.findByAltText('Dr Demo')
    expect(img).toHaveAttribute('src', 'http://test/api/public/doctors/5/photo?v=99')
    expect(img.className).toMatch(/aspect-\[4\/5\]/)
    expect(img.className).toMatch(/object-top/)
  })

  it('falls back to initials when the doctor has no photo', async () => {
    site([], [{ ...doctor, hasPhoto: false }])
    render(<Providers><SiteProvider><DoctorSection /></SiteProvider></Providers>)
    expect(await screen.findByLabelText('Dr Demo')).toHaveTextContent('D')
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('Admin clinic photo upload', () => {
  beforeEach(() => { reset(); apiMock.get.mockImplementation(() => ok([])) })

  it('uploads a photo with its caption as multipart form data', async () => {
    apiMock.post.mockReturnValue(ok({}))
    render(<Providers><AdminGallery /></Providers>)
    const input = (await screen.findByLabelText('Choose photos')) as HTMLInputElement
    await userEvent.upload(input, new File([new Uint8Array(10)], 'front.jpg', { type: 'image/jpeg' }))
    await userEvent.type(await screen.findByLabelText('Caption (optional)'), 'Reception area')
    await userEvent.click(screen.getByRole('button', { name: /upload photo/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalled())
    const [url, fd] = apiMock.post.mock.calls[0]
    expect(url).toBe('/admin/clinic-photos')
    expect((fd as FormData).get('caption')).toBe('Reception area')
    expect(((fd as FormData).get('file') as File).name).toBe('front.jpg')
  })

  it('refuses a photo over 5 MB or of the wrong type before sending anything', async () => {
    render(<Providers><AdminGallery /></Providers>)
    const input = (await screen.findByLabelText('Choose photos')) as HTMLInputElement
    await userEvent.upload(input, new File([new ArrayBuffer(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' }))
    await userEvent.click(screen.getByRole('button', { name: /upload photo/i }))
    expect(await screen.findByText(/must be a JPG, PNG or WebP image up to 5 MB/)).toBeInTheDocument()
    expect(apiMock.post).not.toHaveBeenCalled()
  })
})
