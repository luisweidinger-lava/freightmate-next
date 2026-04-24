'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

export default function CtaBanner() {
  return (
    <section className="py-28" style={{ background: '#0f172a' }}>
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        {/* Faint glow accent */}
        <div
          className="absolute inset-x-0 mx-auto w-[600px] h-[200px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center gap-6"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Get started</p>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Ready to connect the world's freight?
          </h2>

          <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
            Join freight forwarders who run leaner, faster operations with Nexio. No long onboarding — live in days.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-lg shadow-blue-900/40 hover:shadow-blue-700/40 hover:-translate-y-0.5"
            >
              Request a Demo
              <ChevronRight size={15} strokeWidth={2} />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white text-sm font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
            >
              See pricing
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
