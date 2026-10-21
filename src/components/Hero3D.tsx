import { motion } from 'framer-motion'

/** Subtle animated orthopaedic joint illustration (pure SVG, no external assets). */
export function Hero3D() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md" aria-hidden>
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-brand-100 via-white to-sky-100" />
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="absolute rounded-full border border-brand-300/50"
          style={{ inset: `${i * 12}%` }}
          animate={{ rotate: i % 2 ? -360 : 360 }} transition={{ duration: 60 + i * 20, repeat: Infinity, ease: 'linear' }} />
      ))}
      <motion.svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-xl"
        animate={{ y: [0, -8, 0], rotateZ: [-1.5, 1.5, -1.5] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
        <defs>
          <linearGradient id="bone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cfe8ec" /></linearGradient>
          <linearGradient id="joint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3ac8c4" /><stop offset="1" stopColor="#146f72" /></linearGradient>
        </defs>
        {/* upper bone */}
        <path d="M150 40c-22 0-34 26-24 46 8 16 20 28 22 54l6 44h56l6-44c2-26 14-38 22-54 10-20-2-46-24-46-14 0-22 8-32 8s-18-8-32-8z" fill="url(#bone)" stroke="#a7cdd3" strokeWidth="2" />
        {/* lower bone */}
        <path d="M156 262h88l-6 52c-2 20 8 34 8 50 0 14-10 22-26 22h-40c-16 0-26-8-26-22 0-16 10-30 8-50z" fill="url(#bone)" stroke="#a7cdd3" strokeWidth="2" />
        {/* joint */}
        <ellipse cx="200" cy="244" rx="64" ry="24" fill="url(#joint)" opacity="0.95" />
        <ellipse cx="200" cy="240" rx="44" ry="12" fill="#ffffff" opacity="0.25" />
      </motion.svg>
      <motion.div className="absolute right-2 top-10 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg ring-1 ring-slate-100"
        animate={{ y: [0, 6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" /> Online booking open
      </motion.div>
      <motion.div className="absolute bottom-12 left-0 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg ring-1 ring-slate-100"
        animate={{ y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
        Digital prescriptions &amp; reminders
      </motion.div>
    </div>
  )
}
