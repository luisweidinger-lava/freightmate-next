'use client'

import { motion } from 'framer-motion'

const LOGOS = [
  { name: 'Hartmann Logistics',  abbr: 'HL' },
  { name: 'Meridian Cargo',      abbr: 'MC' },
  { name: 'BlueBridge Freight',  abbr: 'BB' },
  { name: 'Oceanic Express',     abbr: 'OE' },
  { name: 'Valor Shipping',      abbr: 'VS' },
  { name: 'Crestline Logistics', abbr: 'CL' },
]

export default function LogoBar() {
  return (
    <section className="py-16 border-y border-slate-100 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-10"
        >
          Trusted by leading freight forwarders
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {LOGOS.map((logo, i) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex items-center gap-2.5 text-slate-400 hover:text-slate-600 transition-colors duration-200 cursor-default select-none"
            >
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                {logo.abbr}
              </div>
              <span className="text-sm font-semibold tracking-tight">{logo.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
