
import { motion } from 'framer-motion'

/** Animated running orthopaedic logo for the homepage hero. */
export function Hero3D() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
      {/* Soft background glow */}
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-50 via-white to-emerald-50" />

      {/* Floating animated logo */}
      <motion.div
        className="relative z-10 flex max-h-80 w-full items-center justify-center"
        animate={{
          y: [0, -7, 0, 4, 0],
          scale: [1, 1.015, 1, 1.01, 1],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <img
          src="/images/orthopaedic-running-logo.jpeg"
          alt="Running figure representing orthopaedic and joint health"
          className="max-h-100 w-full object-contain drop-shadow-xl"
        />
      </motion.div>

      {/* Keep Moving — above image */}
      <motion.div
        className="absolute right-0 top-12 z-20 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg ring-1 ring-slate-100"
        animate={{ x: [0, 4, 0], y: [0, -3, 0] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
        Keep Moving
      </motion.div>

      {/* Bone, Joint & Spine Care — above image */}
      <motion.div
        className="absolute bottom-8 left-0 z-20 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-100"
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        Bone, Joint &amp; Spine Care
      </motion.div>
    </div>
  )
}
