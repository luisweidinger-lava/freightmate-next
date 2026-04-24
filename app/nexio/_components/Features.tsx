'use client'

import { motion } from 'framer-motion'
import { Radio, Route, Globe2 } from 'lucide-react'

const CARDS = [
  {
    icon: Radio,
    title: 'Real-time Tracking',
    desc:
      'Live visibility across every milestone — from booking confirmation to final delivery. Know exactly where every consignment is at any moment.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Route,
    title: 'AI-Powered Routing',
    desc:
      'Intelligent route optimisation that factors in port congestion, weather, carrier rates, and customs lead times — automatically surfaced per shipment.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    icon: Globe2,
    title: 'Global Port Coverage',
    desc:
      'Over 10,000 port-pair routes across 150+ countries. Nexio maintains live carrier schedules and flags disruptions before they impact your operations.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
]

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

export default function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Platform</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-snug">
            Built for the speed of modern freight
          </h2>
          <p className="mt-4 text-slate-500 text-lg leading-relaxed">
            Every feature is designed around the realities of freight forwarding — no bloat, no generic CRM features.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {CARDS.map(card => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                variants={item}
                className="group relative p-8 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all duration-200 cursor-default"
              >
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-6`}>
                  <Icon size={20} strokeWidth={1.5} className={card.color} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{card.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
