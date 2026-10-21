import type { MedDocType } from './types'

export interface FieldDef { key: string; label: string; kind: 'text' | 'textarea' | 'date'; required?: boolean; max: number; rows?: number; placeholder?: string }
export interface DocDef { id: MedDocType; title: string; heading: string; description: string; fields: FieldDef[]; anyOf?: { keys: string[]; message: string } }

const t = (key: string, label: string, max: number, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind: 'text', max, ...extra })
const a = (key: string, label: string, max: number, rows = 3, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind: 'textarea', max, rows, ...extra })
const d = (key: string, label: string): FieldDef => ({ key, label, kind: 'date', max: 10 })

/** Same fields, limits and rules as the server (MedicalDocumentRules.java). Nothing is pre-filled or invented. */
export const DOC_TYPES: DocDef[] = [
  { id: 'MEDICAL_CERTIFICATE', title: 'Medical certificate', heading: 'MEDICAL CERTIFICATE', description: 'Condition, treatment period, rest advised and fitness to resume duties.',
    fields: [a('condition', 'Medical condition / reason', 2000, 3, { required: true }), d('treatmentStart', 'Treatment start date'), d('treatmentEnd', 'Treatment end date'),
      t('restAdvised', 'Rest advised', 200, { placeholder: 'e.g. 7 days' }), d('fitToResumeDate', 'Fit to resume work / regular duties on'), a('remarks', 'Remarks', 1000, 2)] },
  { id: 'PHYSIOTHERAPY_REFERRAL', title: 'Physiotherapy certificate / referral', heading: 'PHYSIOTHERAPY REFERRAL', description: 'Diagnosis, physiotherapy period and treatment instructions.',
    fields: [a('diagnosis', 'Diagnosis / clinical reason', 1000, 3, { required: true }), d('startDate', 'Physiotherapy start date'), t('duration', 'Recommended duration', 200),
      d('endDate', 'Physiotherapy end date'), a('instructions', 'Treatment instructions', 3000, 5)] },
  { id: 'IMPLANT_CERTIFICATE', title: 'Implant certificate', heading: 'IMPLANT CERTIFICATE', description: 'Implant type, location, details and surgery date - all optional, enter only what is verified.',
    fields: [a('diagnosis', 'Diagnosis / medical reason', 1000, 2), t('implantType', 'Implant type', 300), t('implantLocation', 'Implant location', 300), a('implantDetails', 'Implant details', 1500, 3),
      d('surgeryDate', 'Surgery date'), a('notes', 'Relevant medical notes', 2000, 3)],
    anyOf: { keys: ['diagnosis', 'implantType', 'implantLocation'], message: 'Enter at least the diagnosis, implant type or implant location' } },
  { id: 'ADMISSION_ADVICE', title: 'Admission / operation advice', heading: 'ADMISSION / OPERATION ADVICE', description: 'Admission and operation dates, planned procedure, NBM and pre-operative instructions.',
    fields: [a('diagnosis', 'Diagnosis / reason for admission', 1000, 2, { required: true }), a('plannedProcedure', 'Planned procedure', 1000, 2, { required: true }), d('admissionDate', 'Hospital admission date'),
      d('operationDate', 'Proposed operation date'), a('anaesthesiaAssessment', 'Anaesthesia assessment / fitness instructions', 1500, 3), a('nbmInstructions', 'NBM instructions', 1500, 2),
      t('nbmTime', 'NBM from (time)', 100, { placeholder: 'e.g. 10:00 PM the night before' }), a('otherInstructions', 'Other pre-operative instructions', 3000, 4)] },
]

export const docDef = (id: MedDocType) => DOC_TYPES.find((x) => x.id === id)!

const ORDER: [string, string, string][] = [
  ['treatmentStart', 'treatmentEnd', 'Cannot be before the treatment start date'], ['treatmentStart', 'fitToResumeDate', 'Cannot be before the treatment start date'],
  ['startDate', 'endDate', 'Cannot be before the start date'], ['admissionDate', 'operationDate', 'Cannot be before the admission date'],
]

/** Per-field messages (key -> message); '_form' holds form-level problems. Empty object = valid. */
export function validateDoc(def: DocDef, content: Record<string, string>, forIssue: boolean): Record<string, string> {
  const errs: Record<string, string> = {}
  const val = (k: string) => (content[k] ?? '').trim()
  for (const f of def.fields) {
    const v = val(f.key)
    if (!v) { if (forIssue && f.required) errs[f.key] = 'Required before issuing'; continue }
    if (v.length > f.max) errs[f.key] = `Maximum ${f.max} characters`
  }
  for (const [first, second, msg] of ORDER) if (val(first) && val(second) && val(second) < val(first) && !errs[second]) errs[second] = msg
  if (forIssue && def.anyOf && def.anyOf.keys.every((k) => !val(k))) errs._form = def.anyOf.message
  return errs
}

export const STATUS_LABEL = { DRAFT: 'Draft', ISSUED: 'Issued' } as const
