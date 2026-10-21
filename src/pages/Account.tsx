import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, errMsg } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Field, Input, PageHeader, useUI } from '../components/ui'
import { labelize } from '../lib/utils'

const schema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'At least 8 characters').regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Use letters and at least one digit'),
  confirm: z.string(),
}).refine((d) => d.newPassword === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export function Account() {
  const { user } = useAuth()
  const { toast } = useUI()
  const [error, setError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  return (
    <>
      <PageHeader title="My account" subtitle={`${user?.fullName} - ${user?.email} - ${user ? labelize(user.role) : ''}`} />
      <Card className="max-w-md space-y-4 p-5 sm:p-6">
        <h2 className="font-semibold">Change password</h2>
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async ({ currentPassword, newPassword }) => {
          setError('')
          try { await api.post('/auth/change-password', { currentPassword, newPassword }); toast.success('Password changed'); reset() } catch (e) { setError(errMsg(e)) }
        })}>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Field label="Current password" error={errors.currentPassword?.message}><Input type="password" autoComplete="current-password" {...register('currentPassword')} /></Field>
          <Field label="New password" error={errors.newPassword?.message}><Input type="password" autoComplete="new-password" {...register('newPassword')} /></Field>
          <Field label="Confirm new password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" {...register('confirm')} /></Field>
          <Button type="submit" loading={isSubmitting}>Update password</Button>
        </form>
      </Card>
    </>
  )
}
