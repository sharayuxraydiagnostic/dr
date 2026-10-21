import { Activity, Bone, CalendarClock, ClipboardList, Dumbbell, FileText, HeartPulse, Scan, ShieldCheck, Smartphone, Stethoscope, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Icon keys selectable in Admin > Website content. */
export const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope, scan: Scan, dumbbell: Dumbbell, bone: Bone, users: Users, smartphone: Smartphone,
  calendar: CalendarClock, clipboard: ClipboardList, file: FileText, activity: Activity, wallet: Wallet, shield: ShieldCheck, heart: HeartPulse,
}
export const ICON_KEYS = Object.keys(ICONS)
export const iconFor = (key?: string): LucideIcon => (key && ICONS[key]) || Stethoscope
