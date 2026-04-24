'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Play } from 'lucide-react'
import dynamic from 'next/dynamic'

const Globe = dynamic(() => import('./Globe'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-blue-950 opacity-60 animate-pulse" />
    </div>
  ),
})

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(155deg, #eff6ff 0%, #f0f4ff 40%, #eef2ff 100%)' }}
    >
      {/* Subtle radial glow behind globe area */}
      <div
        className="absolute right-0 top-0 w-[65%] h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 70% 50%, rgba(59,130,246,0.08) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 lg:px-8 flex-1 flex items-center">
        <div className="w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center pt-24 pb-16 lg:pt-20 lg:pb-12">

          {/* Left — text content */}
          <div className="flex flex-col gap-6 max-w-xl">
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Now in Early Access
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[2.75rem] leading-[1.1] sm:text-5xl lg:text-[3.5rem] font-extrabold text-slate-900 tracking-tight"
            >
              The Nexus of{' '}
              <span
                className="relative"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Freight Forwarding
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg text-slate-500 leading-relaxed"
            >
              Track every shipment. Connect every route. Operate with confidence.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-3 pt-2"
            >
              <a
                href="#"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 hover:-translate-y-0.5"
              >
                Request a Demo
                <ChevronRight size={15} strokeWidth={2} />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border-2 border-slate-300 hover:border-blue-400 text-slate-700 hover:text-blue-700 text-sm font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 bg-white/60 backdrop-blur-sm"
              >
                <Play size={14} strokeWidth={1.5} />
                See How It Works
              </a>
            </motion.div>

            {/* Social proof micro-line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-xs text-slate-400 pt-1"
            >
              Trusted by freight forwarders in 40+ countries
            </motion.p>
          </div>

          {/* Right — Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full aspect-square max-w-[580px] mx-auto lg:mx-0 lg:ml-auto"
          >
            <Globe />
          </motion.div>
        </div>
      </div>

      {/* Bottom fade to white */}
      <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none"
           style={{ background: 'linear-gradient(to top, white, transparent)' }} />
    </section>
  )
}
