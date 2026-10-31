export type Role = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PATIENT'
export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'CHECKED_IN' | 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type AppointmentType = 'ONLINE' | 'WALK_IN' | 'FOLLOW_UP'
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING'
export type BillCategory = 'CONSULTATION' | 'PROCEDURE' | 'DIAGNOSTIC' | 'PHYSIOTHERAPY' | 'MEDICINE' | 'OTHER'
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'
export type ReportType = 'XRAY' | 'MRI' | 'BLOOD' | 'OTHER'
export type FollowUpOption = 'NONE' | 'DAYS_3' | 'DAYS_7' | 'DAYS_15' | 'DAYS_30' | 'CUSTOM' | 'DAYS'

export interface UserView { id: number; fullName: string; email: string; phone?: string; role: Role; patientId?: number | null; doctorId?: number | null; enabled: boolean }
export interface AuthResponse { token: string; user: UserView }
export interface PatientView { id: number; patientCode: string; fullName: string; phone: string; email?: string; dateOfBirth?: string; gender?: string; address?: string; bloodGroup?: string; emergencyContactName?: string; emergencyContactPhone?: string; hasPortalAccount: boolean; createdAt: string }
export interface DoctorView { id: number; userId?: number; fullName: string; email?: string; phone?: string; departmentId?: number; departmentName?: string; specialization?: string; qualification?: string; registrationNumber?: string; consultationFee: number; bio?: string; slotMinutes: number; maxPatientsPerSlot: number; active: boolean; hasPhoto: boolean; photoVersion: number }
export interface ServiceView { id: number; name: string; description?: string; departmentId?: number; departmentName?: string; price: number; active: boolean }
export interface DepartmentView { id: number; name: string; description?: string }
export interface SlotView { startTime: string; endTime: string; remaining: number }
export interface AppointmentView { id: number; code: string; patientId: number; patientCode: string; patientName: string; patientPhone: string; doctorId: number; doctorName: string; date: string; startTime: string; endTime: string; status: AppointmentStatus; type: AppointmentType; reason?: string; tokenNumber?: number | null; consultationFee: number; consultationId?: number | null; canModify: boolean }
export interface QueueView { id: number; appointmentId: number; appointmentCode: string; patientId: number; patientName: string; patientCode: string; doctorId: number; doctorName: string; token: number; status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'SKIPPED'; checkedInAt: string; calledAt?: string; scheduledTime: string }
export interface DiagnosisDto { name: string; icdCode?: string; notes?: string }
export interface PrescriptionItemDto { medicineName: string; composition?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string; frequencyLocal?: string; durationLocal?: string; instructionsLocal?: string }
export type PrescriptionLang = 'EN' | 'MR' | 'HI'
export interface FollowUpView { id: number; patientId: number; patientName: string; doctorName: string; date: string; time?: string; status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'; appointmentId?: number; appointmentCode?: string; notes?: string }
export interface ConsultationView { id: number; appointmentId: number; appointmentCode: string; patientId: number; patientName: string; doctorName: string; symptoms?: string; examinationNotes?: string; treatmentPlan?: string; testsAdvised?: string; advice?: string; status: 'IN_PROGRESS' | 'COMPLETED'; startedAt: string; completedAt?: string; diagnoses: DiagnosisDto[]; items: PrescriptionItemDto[]; prescriptionNotes?: string; prescriptionId?: number; followUp?: FollowUpView; language?: PrescriptionLang; adviceLocal?: string; testsAdvisedLocal?: string; followUpDays?: number | null }
export interface PrescriptionView { id: number; code: string; consultationId: number; patientId: number; patientName: string; doctorName: string; date: string; notes?: string; items: PrescriptionItemDto[]; diagnoses: string[]; patientCode: string; patientPhone?: string; patientDob?: string; patientGender?: string; doctorQualification?: string; doctorRegistrationNumber?: string; advice?: string; testsAdvised?: string; language?: PrescriptionLang; adviceLocal?: string; testsAdvisedLocal?: string; symptoms?: string; examinationNotes?: string; followUpDays?: number | null }
export interface ReportView { id: number; patientId: number; appointmentId?: number; reportType: ReportType; title: string; notes?: string; reportDate: string; documentId?: number; fileName?: string; contentType?: string; sizeBytes?: number }
export interface BillItemView { id: number; category: BillCategory; description: string; quantity: number; unitPrice: number; amount: number }
export interface PaymentView { id: number; amount: number; method: PaymentMethod; reference?: string; paidAt: string }
export interface BillView { id: number; billNumber: string; patientId: number; patientName: string; patientCode: string; appointmentId?: number; items: BillItemView[]; subtotal: number; discount: number; taxPercent: number; tax: number; total: number; paid: number; pending: number; status: PaymentStatus; notes?: string; createdAt: string; payments: PaymentView[] }
export interface HistoryView { patient: PatientView; appointments: AppointmentView[]; consultations: ConsultationView[]; prescriptions: PrescriptionView[]; followUps: FollowUpView[]; reports: ReportView[]; bills: BillView[] }
export interface CompleteResponse { consultation: ConsultationView; followUp?: FollowUpView; followUpMessage: string }
export interface NotificationView { id: number; channel: string; type: string; title: string; message: string; status: string; scheduledAt: string; sentAt?: string; read: boolean }
export interface AvailabilityDto { dayOfWeek: string; startTime: string; endTime: string; breakStart?: string | null; breakEnd?: string | null; active: boolean }
export interface LeaveView { id: number; date: string; reason?: string }
export interface DailyPoint { date: string; value: number }
export interface AdminSummary { patients: number; doctors: number; appointmentsToday: number; completedToday: number; revenueToday: number; pendingAmount: number; statusBreakdown: Record<string, number>; appointmentsPerDay: DailyPoint[]; revenuePerDay: DailyPoint[] }
export interface AuditView { id: number; username?: string; action: string; entityType?: string; entityId?: string; details?: string; ipAddress?: string; createdAt: string }
export type ContentType = 'FACILITY' | 'WHY_US' | 'TESTIMONIAL' | 'HEALTH_TIP'
export interface ContentView { id: number; type: ContentType; slug?: string; title: string; subtitle?: string; body?: string; icon?: string; sortOrder: number; active: boolean }
export interface MedicineView { id: number; name: string; composition?: string; useCount: number }
export interface TranslatedText { source: string; text: string; method: 'GLOSSARY' | 'MACHINE' | 'PARTIAL'; complete: boolean }
export interface TranslateResponse { translations: TranslatedText[]; machineAvailable: boolean }
export interface ClinicPhotoView { id: number; caption?: string; sortOrder: number; active: boolean; version: number }
export type ReportPeriod = 'DAY' | 'WEEK' | 'MONTH'
export interface ReportRow { start: string; end: string; appointments: number; completed: number; cancelled: number; noShow: number; walkIns: number; online: number; followUps: number; newPatients: number; billed: number; collected: number }
export interface ReportResponse { period: ReportPeriod; from: string; to: string; totals: ReportRow; rows: ReportRow[]; outstandingNow: number }
export interface ChatMessageView { id: number; senderId: number; senderName: string; senderRole: Role; body: string; deleted: boolean; createdAt: string; updatedAt: string; mine: boolean }
export interface ChatMember { id: number; name: string; role: Role }
export type MedDocType = 'MEDICAL_CERTIFICATE' | 'PHYSIOTHERAPY_REFERRAL' | 'IMPLANT_CERTIFICATE' | 'ADMISSION_ADVICE'
export interface MedicalDocView { id: number; code: string; docType: MedDocType; status: 'DRAFT' | 'ISSUED'; documentDate: string; patientId: number; patientName: string; patientCode: string; doctorId: number; doctorName: string; doctorQualification?: string; doctorRegistrationNumber?: string; content: Record<string, string>; issuedAt?: string; revisionOfId?: number; printCount: number; createdAt: string; updatedAt: string }
export interface PrintSettings { top: number; bottom: number; left: number; right: number }
