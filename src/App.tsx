// import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
// import { Activity, Bell, CalendarClock, CalendarOff, CalendarPlus, ClipboardList, FileText, FolderPlus, HeartPulse, FileSignature, LayoutDashboard, MessageSquare, Pill, BarChart3, Image as ImageIcon, Receipt, ScrollText, Search, Settings, Stethoscope, UserCog, UserRound, Users, Globe } from 'lucide-react'
// import { DashboardLayout, PublicLayout } from './components/Layouts'
// import { PageLoader } from './components/ui'
// import { homeFor, useAuth } from './context/AuthContext'
// import type { Role } from './lib/types'
// import { About, Contact, DoctorProfile, Facilities, Home, HealthTip, HealthTips, Services, Testimonials, WhyUs } from './pages/public/PublicPages'
// import { BookPublic, Login, Register } from './pages/public/AuthPages'
// import { PatientAppointments, PatientBills, PatientBooking, PatientHome, PatientNotifications, PatientVisits, PatientPrescriptions, PatientReports } from './pages/portal/PatientPages'
// import { NewAppointment, ReceptionAvailability, ReceptionBilling, ReceptionDocuments, ReceptionHome, ReceptionPatients, ReceptionQueue } from './pages/reception/ReceptionPages'
// import { DoctorSchedule } from './pages/doctor/DoctorSchedule'
// import { Consultation, DoctorHome, DoctorPatients, PatientHistory } from './pages/doctor/DoctorPages'
// import { Account } from './pages/Account'
// import { Reports } from './pages/Reports'
// import { Chat } from './pages/Chat'
// import { MedicalDocuments } from './pages/doctor/MedicalDocuments'
// import { PrintAlignment, PrintMedicalDocument } from './pages/PrintMedicalDocument'
// import { PrescriptionPrint } from './pages/PrescriptionPrint'
// import { AdminAudit, AdminContent, AdminDoctors, AdminGallery, AdminHome, AdminPatients, AdminServices, AdminSettings, AdminStaff } from './pages/admin/AdminPages'

// /** Frontend route guard (UX only - the backend enforces real authorization on every API call). */
// function AnyRole({ children }: { children: React.ReactNode }) {
//   const { user, loading } = useAuth()
//   const loc = useLocation()
//   if (loading) return <PageLoader />
//   if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
//   return <>{children}</>
// }

// function Guard({ role, children }: { role: Role; children: React.ReactNode }) {
//   const { user, loading } = useAuth()
//   const loc = useLocation()
//   if (loading) return <PageLoader />
//   if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
//   if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
//   return <>{children}</>
// }

// const patientNav = [
//   { to: '/portal', label: 'Overview', icon: <LayoutDashboard />, end: true }, { to: '/portal/appointments', label: 'Appointments', icon: <CalendarClock /> }, { to: '/portal/book', label: 'Book appointment', icon: <CalendarPlus /> },
//   { to: '/portal/visits', label: 'My visits', icon: <Stethoscope /> }, { to: '/portal/prescriptions', label: 'Prescriptions', icon: <Pill /> }, { to: '/portal/reports', label: 'Reports', icon: <FileText /> }, { to: '/portal/bills', label: 'Bills', icon: <Receipt /> }, { to: '/portal/notifications', label: 'Notifications', icon: <Bell /> }, { to: '/portal/account', label: 'My account', icon: <UserRound /> },
// ]
// const receptionNav = [
//   { to: '/reception', label: 'Today', icon: <LayoutDashboard />, end: true }, { to: '/reception/queue', label: 'Live queue', icon: <ClipboardList /> }, { to: '/reception/chat', label: 'Messages', icon: <MessageSquare /> }, { to: '/reception/appointments/new', label: 'New appointment', icon: <CalendarPlus /> },
//   { to: '/reception/patients', label: 'Patients', icon: <Users /> }, { to: '/reception/billing', label: 'Billing', icon: <Receipt /> }, { to: '/reception/documents', label: 'Reports & documents', icon: <FolderPlus /> }, { to: '/reception/availability', label: 'Doctor availability', icon: <CalendarClock /> }, { to: '/reception/account', label: 'My account', icon: <UserRound /> },
// ]
// const doctorNav = [
//   { to: '/doctor', label: "Today's clinic", icon: <Stethoscope />, end: true }, { to: '/doctor/medical-documents', label: 'Medical documents', icon: <FileSignature /> }, { to: '/doctor/chat', label: 'Messages', icon: <MessageSquare /> }, { to: '/doctor/patients', label: 'Patient search', icon: <Search /> }, { to: '/doctor/reports', label: 'Reports', icon: <BarChart3 /> }, { to: '/doctor/schedule', label: 'Block slots', icon: <CalendarOff /> }, { to: '/doctor/billing', label: 'Billing', icon: <Receipt /> }, { to: '/doctor/documents', label: 'Reports & documents', icon: <FolderPlus /> }, { to: '/doctor/account', label: 'My account', icon: <UserRound /> },
// ]
// const adminNav = [
//   { to: '/admin', label: 'Overview', icon: <LayoutDashboard />, end: true }, { to: '/admin/doctors', label: 'Doctors', icon: <HeartPulse /> }, { to: '/admin/reports', label: 'Reports', icon: <BarChart3 /> }, { to: '/admin/staff', label: 'Staff & users', icon: <UserCog /> },
//   { to: '/admin/patients', label: 'Patients', icon: <Users /> }, { to: '/admin/services', label: 'Services', icon: <Activity /> }, { to: '/admin/content', label: 'Website content', icon: <Globe /> }, { to: '/admin/gallery', label: 'Clinic photos', icon: <ImageIcon /> }, { to: '/admin/settings', label: 'Settings', icon: <Settings /> }, { to: '/admin/audit', label: 'Audit log', icon: <ScrollText /> }, { to: '/admin/account', label: 'My account', icon: <UserRound /> },
// ]

// export default function App() {
//   return (
//     <Routes>
//       <Route element={<PublicLayout />}>
//         <Route index element={<Home />} /><Route path="about" element={<About />} /><Route path="doctor-profile" element={<DoctorProfile />} /><Route path="services" element={<Services />} />
//         <Route path="facilities" element={<Facilities />} /><Route path="why-choose-us" element={<WhyUs />} /><Route path="testimonials" element={<Testimonials />} />
//         <Route path="health-tips" element={<HealthTips />} /><Route path="health-tips/:slug" element={<HealthTip />} /><Route path="contact" element={<Contact />} />
//         <Route path="book" element={<BookPublic />} /><Route path="login" element={<Login />} /><Route path="register" element={<Register />} />
//       </Route>

//       <Route path="/portal" element={<Guard role="PATIENT"><DashboardLayout items={patientNav} title="Patient portal" /></Guard>}>
//         <Route index element={<PatientHome />} /><Route path="appointments" element={<PatientAppointments />} /><Route path="book" element={<PatientBooking />} />
//         <Route path="visits" element={<PatientVisits />} /><Route path="prescriptions" element={<PatientPrescriptions />} /><Route path="reports" element={<PatientReports />} /><Route path="bills" element={<PatientBills />} /><Route path="notifications" element={<PatientNotifications />} /><Route path="account" element={<Account />} />
//       </Route>

//       <Route path="/reception" element={<Guard role="RECEPTIONIST"><DashboardLayout items={receptionNav} title="Reception" /></Guard>}>
//         <Route index element={<ReceptionHome />} /><Route path="queue" element={<ReceptionQueue />} /><Route path="chat" element={<Chat />} /><Route path="appointments/new" element={<NewAppointment />} />
//         <Route path="patients" element={<ReceptionPatients />} /><Route path="schedule" element={<DoctorSchedule />} /><Route path="medical-documents" element={<MedicalDocuments />} /><Route path="chat" element={<Chat />} /><Route path="reports" element={<Reports />} /><Route path="billing" element={<ReceptionBilling />} /><Route path="documents" element={<ReceptionDocuments />} /><Route path="availability" element={<ReceptionAvailability />} /><Route path="account" element={<Account />} />
//       </Route>

//       <Route path="/doctor" element={<Guard role="DOCTOR"><DashboardLayout items={doctorNav} title="Doctor" /></Guard>}>
//         <Route index element={<DoctorHome />} /><Route path="consultation/:id" element={<Consultation />} /><Route path="patients" element={<DoctorPatients />} /><Route path="patients/:id" element={<PatientHistory />} /><Route path="schedule" element={<DoctorSchedule />} /><Route path="medical-documents" element={<MedicalDocuments />} /><Route path="chat" element={<Chat />} /><Route path="reports" element={<Reports />} /><Route path="billing" element={<ReceptionBilling />} /><Route path="documents" element={<ReceptionDocuments />} /><Route path="account" element={<Account />} />
//       </Route>

//       <Route path="/admin" element={<Guard role="ADMIN"><DashboardLayout items={adminNav} title="Administration" /></Guard>}>
//         <Route index element={<AdminHome />} />
//         <Route path="doctors" element={<AdminDoctors />} />
//         <Route path="staff" element={<AdminStaff />} />
//         <Route path="patients" element={<AdminPatients />} />
//         <Route path="services" element={<AdminServices />} />
//         <Route path="settings" element={<AdminSettings />} />
//         <Route path="audit" element={<AdminAudit />} /><Route path="content" element={<AdminContent />} /><Route path="gallery" element={<AdminGallery />} /><Route path="reports" element={<Reports />} /><Route path="account" element={<Account />} />
//       </Route>
//       <Route path="/print/medical-document/:id" element={<Guard role="DOCTOR"><PrintMedicalDocument /></Guard>} />
//       <Route path="/print/alignment" element={<AnyRole><PrintAlignment /></AnyRole>} />
//       <Route path="/print/prescription/:id" element={<AnyRole><PrescriptionPrint /></AnyRole>} />
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   )
// }
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, Bell, CalendarClock, CalendarOff, CalendarPlus, ClipboardList, FileText, FolderPlus, HeartPulse, FileSignature, LayoutDashboard, MessageSquare, Pill, BarChart3, Image as ImageIcon, Receipt, ScrollText, Search, Settings, Stethoscope, UserCog, UserRound, Users, Globe } from 'lucide-react'
import { DashboardLayout, PublicLayout } from './components/Layouts'
import { PageLoader } from './components/ui'
import { homeFor, useAuth } from './context/AuthContext'
import type { Role } from './lib/types'
import { About, Contact, DoctorProfile, Facilities, Home, HealthTip, HealthTips, Services, Testimonials, WhyUs } from './pages/public/PublicPages'
import { BookPublic, Login, Register } from './pages/public/AuthPages'
import { PatientAppointments, PatientBills, PatientBooking, PatientHome, PatientNotifications, PatientVisits, PatientPrescriptions, PatientReports } from './pages/portal/PatientPages'
import { NewAppointment, ReceptionAvailability, ReceptionBilling, ReceptionDocuments, ReceptionHome, ReceptionPatients, ReceptionQueue } from './pages/reception/ReceptionPages'
import { DoctorSchedule } from './pages/doctor/DoctorSchedule'
import { Consultation, DoctorHome, DoctorPatients, PatientHistory } from './pages/doctor/DoctorPages'
import { Account } from './pages/Account'
import { Reports } from './pages/Reports'
import { Chat } from './pages/Chat'
import { MedicalDocuments } from './pages/doctor/MedicalDocuments'
import { PrintAlignment, PrintMedicalDocument } from './pages/PrintMedicalDocument'
import { PrescriptionPrint } from './pages/PrescriptionPrint'
import { AdminAudit, AdminContent, AdminDoctors, AdminGallery, AdminHome, AdminPatients, AdminServices, AdminSettings, AdminStaff } from './pages/admin/AdminPages'

/** Frontend route guard (UX only - the backend enforces real authorization on every API call). */
function AnyRole({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  return <>{children}</>
}

function Guard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}

const patientNav = [
  { to: '/portal', label: 'Overview', icon: <LayoutDashboard />, end: true }, { to: '/portal/appointments', label: 'Appointments', icon: <CalendarClock /> }, { to: '/portal/book', label: 'Book appointment', icon: <CalendarPlus /> },
  { to: '/portal/visits', label: 'My visits', icon: <Stethoscope /> }, { to: '/portal/prescriptions', label: 'Prescriptions', icon: <Pill /> }, { to: '/portal/reports', label: 'Reports', icon: <FileText /> }, { to: '/portal/bills', label: 'Bills', icon: <Receipt /> }, { to: '/portal/notifications', label: 'Notifications', icon: <Bell /> }, { to: '/portal/account', label: 'My account', icon: <UserRound /> },
]
const receptionNav = [
  { to: '/reception', label: 'Today', icon: <LayoutDashboard />, end: true }, { to: '/reception/queue', label: 'Live queue', icon: <ClipboardList /> }, { to: '/reception/chat', label: 'Messages', icon: <MessageSquare /> }, { to: '/reception/appointments/new', label: 'New appointment', icon: <CalendarPlus /> },
  { to: '/reception/patients', label: 'Patients', icon: <Users /> }, { to: '/reception/billing', label: 'Billing', icon: <Receipt /> }, { to: '/reception/documents', label: 'Reports & documents', icon: <FolderPlus /> }, { to: '/reception/availability', label: 'Doctor availability', icon: <CalendarClock /> }, { to: '/reception/account', label: 'My account', icon: <UserRound /> },
]
const doctorNav = [
  { to: '/doctor', label: "Today's clinic", icon: <Stethoscope />, end: true }, { to: '/doctor/medical-documents', label: 'Medical documents', icon: <FileSignature /> }, { to: '/doctor/chat', label: 'Messages', icon: <MessageSquare /> }, { to: '/doctor/patients', label: 'Patient search', icon: <Search /> }, { to: '/doctor/reports', label: 'Reports', icon: <BarChart3 /> }, { to: '/doctor/schedule', label: 'Block slots', icon: <CalendarOff /> }, { to: '/doctor/billing', label: 'Billing', icon: <Receipt /> }, { to: '/doctor/documents', label: 'Reports & documents', icon: <FolderPlus /> }, { to: '/doctor/desk', label: 'Reception desk', icon: <LayoutDashboard /> }, { to: '/doctor/queue', label: 'Live queue', icon: <ClipboardList /> }, { to: '/doctor/appointments/new', label: 'New appointment', icon: <CalendarPlus /> }, { to: '/doctor/manage-patients', label: 'Register / edit patients', icon: <Users /> }, { to: '/doctor/availability', label: 'Doctor availability', icon: <CalendarClock /> },
  { to: '/doctor/account', label: 'My account', icon: <UserRound /> },
]
const adminNav = [
  { to: '/admin', label: 'Overview', icon: <LayoutDashboard />, end: true }, { to: '/admin/doctors', label: 'Doctors', icon: <HeartPulse /> }, { to: '/admin/reports', label: 'Reports', icon: <BarChart3 /> }, { to: '/admin/staff', label: 'Staff & users', icon: <UserCog /> },
  { to: '/admin/patients', label: 'Patients', icon: <Users /> }, { to: '/admin/services', label: 'Services', icon: <Activity /> }, { to: '/admin/content', label: 'Website content', icon: <Globe /> }, { to: '/admin/gallery', label: 'Clinic photos', icon: <ImageIcon /> }, { to: '/admin/settings', label: 'Settings', icon: <Settings /> }, { to: '/admin/audit', label: 'Audit log', icon: <ScrollText /> }, { to: '/admin/account', label: 'My account', icon: <UserRound /> },
]

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} /><Route path="about" element={<About />} /><Route path="doctor-profile" element={<DoctorProfile />} /><Route path="services" element={<Services />} />
        <Route path="facilities" element={<Facilities />} /><Route path="why-choose-us" element={<WhyUs />} /><Route path="testimonials" element={<Testimonials />} />
        <Route path="health-tips" element={<HealthTips />} /><Route path="health-tips/:slug" element={<HealthTip />} /><Route path="contact" element={<Contact />} />
        <Route path="book" element={<BookPublic />} /><Route path="login" element={<Login />} /><Route path="register" element={<Register />} />
      </Route>

      <Route path="/portal" element={<Guard role="PATIENT"><DashboardLayout items={patientNav} title="Patient portal" /></Guard>}>
        <Route index element={<PatientHome />} /><Route path="appointments" element={<PatientAppointments />} /><Route path="book" element={<PatientBooking />} />
        <Route path="visits" element={<PatientVisits />} /><Route path="prescriptions" element={<PatientPrescriptions />} /><Route path="reports" element={<PatientReports />} /><Route path="bills" element={<PatientBills />} /><Route path="notifications" element={<PatientNotifications />} /><Route path="account" element={<Account />} />
      </Route>

      <Route path="/reception" element={<Guard role="RECEPTIONIST"><DashboardLayout items={receptionNav} title="Reception" /></Guard>}>
        <Route index element={<ReceptionHome />} /><Route path="queue" element={<ReceptionQueue />} /><Route path="chat" element={<Chat />} /><Route path="appointments/new" element={<NewAppointment />} />
        <Route path="patients" element={<ReceptionPatients />} /><Route path="schedule" element={<DoctorSchedule />} /><Route path="medical-documents" element={<MedicalDocuments />} /><Route path="chat" element={<Chat />} /><Route path="reports" element={<Reports />} /><Route path="billing" element={<ReceptionBilling />} /><Route path="documents" element={<ReceptionDocuments />} /><Route path="availability" element={<ReceptionAvailability />} /><Route path="account" element={<Account />} />
      </Route>

      <Route path="/doctor" element={<Guard role="DOCTOR"><DashboardLayout items={doctorNav} title="Doctor" /></Guard>}>
        <Route index element={<DoctorHome />} /><Route path="consultation/:id" element={<Consultation />} /><Route path="patients" element={<DoctorPatients />} /><Route path="patients/:id" element={<PatientHistory />} /><Route path="schedule" element={<DoctorSchedule />} /><Route path="medical-documents" element={<MedicalDocuments />} /><Route path="chat" element={<Chat />} /><Route path="reports" element={<Reports />} /><Route path="billing" element={<ReceptionBilling />} /><Route path="documents" element={<ReceptionDocuments />} /><Route path="desk" element={<ReceptionHome />} /><Route path="queue" element={<ReceptionQueue />} /><Route path="appointments/new" element={<NewAppointment />} /><Route path="manage-patients" element={<ReceptionPatients />} /><Route path="availability" element={<ReceptionAvailability />} /><Route path="account" element={<Account />} />
      </Route>

      <Route path="/admin" element={<Guard role="ADMIN"><DashboardLayout items={adminNav} title="Administration" /></Guard>}>
        <Route index element={<AdminHome />} />
        <Route path="doctors" element={<AdminDoctors />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="patients" element={<AdminPatients />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit" element={<AdminAudit />} /><Route path="content" element={<AdminContent />} /><Route path="gallery" element={<AdminGallery />} /><Route path="reports" element={<Reports />} /><Route path="account" element={<Account />} />
      </Route>
      <Route path="/print/medical-document/:id" element={<Guard role="DOCTOR"><PrintMedicalDocument /></Guard>} />
      <Route path="/print/alignment" element={<AnyRole><PrintAlignment /></AnyRole>} />
      <Route path="/print/prescription/:id" element={<AnyRole><PrescriptionPrint /></AnyRole>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

