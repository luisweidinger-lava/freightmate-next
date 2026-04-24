'use client'

import { motion } from 'framer-motion'

const STATS = [
  { value: '150+',   label: 'Countries covered',  sub: 'Global port-to-port network' },
  { value: '10,000+', label: 'Active routes',      sub: 'Updated in real time'        },
  { value: '99.9%',  label: 'Platform uptime',     sub: 'SLA-guaranteed reliability'  },
]

export default function Stats() {
  return (
    <section className="py-20 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center px-8 py-10 sm:py-6"
            >
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">{s.value}</span>
              <span className="mt-2 text-sm font-semibold text-slate-700">{s.label}</span>
              <span className="mt-1 text-xs text-slate-400">{s.sub}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
