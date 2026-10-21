import type { Role } from '../lib/types'
import { Badge } from './ui'

const ROLE: Record<Role, { label: string; tone: string }> = {
  ADMIN: { label: 'Admin', tone: 'amber' },
  DOCTOR: { label: 'Doctor', tone: 'teal' },
  RECEPTIONIST: { label: 'Receptionist', tone: 'blue' },
  PATIENT: { label: 'Patient', tone: 'green' },
}

/** Shows which kind of account is signed in. */
export function RoleBadge({ role }: { role: Role }) {
  return <span data-testid="role-badge"><Badge tone={ROLE[role].tone}>{ROLE[role].label}</Badge></span>
}
