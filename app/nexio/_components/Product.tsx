'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight } from 'lucide-react'

const BULLETS = [
  'One unified view of all active cases',
  'Auto-linked emails, documents, and statuses',
  'AI-generated summaries per shipment',
  'Multi-party communication in a single thread',
]

function MockDashboard() {
  const rows = [
    { status: 'LIVE',  ref: '#4821', carrier: 'LH 8400', route: 'FRA → ORD', client: 'Hartmann Logistics',  eta: 'Dec 15',  label: 'On Track',      dot: 'bg-emerald-500' },
    { status: 'DOCS',  ref: '#4820', carrier: 'SQ 341',  route: 'SIN → DXB', client: 'Meridian Cargo',     eta: 'Dec 14',  label: 'Docs Pending',  dot: 'bg-amber-500'  },
    { status: 'HOLD',  ref: '#4819', carrier: 'MSC',     route: 'SHA → RTM', client: 'BlueBridge Freight', eta: 'Dec 16',  label: 'Customs Hold',  dot: 'bg-red-400'    },
    { status: 'LIVE',  ref: '#4818', carrier: 'CMA',     route: 'RTM → NYC', client: 'Oceanic Express',    eta: 'Dec 17',  label: 'On Track',      dot: 'bg-emerald-500' },
  ]

  const statusColor: Record<string, string> = {
    LIVE: 'text-emerald-700 bg-emerald-50',
    DOCS: 'text-amber-700 bg-amber-50',
    HOLD: 'text-red-700 bg-red-50',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100 overflow-hidden text-xs">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
        </div>
        <span className="text-slate-400 font-medium text-[10px] tracking-wide">Nexio Platform — Active Cases</span>
        <div className="w-16" />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-5 gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
        <span>Status</span>
        <span>Ref</span>
        <span>Route</span>
        <span>Client</span>
        <span>ETA</span>
      </div>

      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={row.ref}
          className={`grid grid-cols-5 gap-2 items-center px-4 py-3 text-[11px] border-b border-slate-50 hover:bg-slate-50 transition-colors duration-150 cursor-pointer ${i === 0 ? 'bg-blue-50/40' : ''}`}
        >
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide w-fit ${statusColor[row.status]}`}>
            {row.status}
          </span>
          <div>
            <p className="font-semibold text-slate-700">{row.ref}</p>
            <p className="text-slate-400 text-[10px]">{row.carrier}</p>
          </div>
          <span className="font-medium text-slate-700">{row.route}</span>
          <span className="text-slate-500 truncate">{row.client}</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
            <div>
              <p className="font-medium text-slate-700">{row.eta}</p>
              <p className="text-slate-400 text-[10px]">{row.label}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400">
        <span>Showing 4 of 28 active cases</span>
        <span className="text-blue-600 font-medium cursor-pointer hover:text-blue-700">View all →</span>
      </div>
    </div>
  )
}

export default function Product() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Workbench</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-snug">
              Decisions happen at the speed of freight.
            </h2>
            <p className="text-slate-500 leading-relaxed">
              Every active shipment, every communication thread, every document — centralised in a single operational workspace. No tab-switching, no lost context.
            </p>

            <ul className="flex flex-col gap-3 mt-2">
              {BULLETS.map(b => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 size={16} strokeWidth={1.5} className="text-blue-600 mt-0.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors duration-200 cursor-pointer mt-2 w-fit"
            >
              Explore the workbench <ArrowRight size={15} strokeWidth={2} />
            </a>
          </motion.div>

          {/* Right — mock dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <MockDashboard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
