'use client'

import { motion } from 'framer-motion'
import { Inbox, FileText, Zap, ArrowRight } from 'lucide-react'

function FloatingCard() {
  return (
    <div className="relative">
      {/* Background card (depth effect) */}
      <div className="absolute top-4 left-4 right-[-8px] bottom-[-8px] rounded-2xl border border-slate-100 bg-slate-50" />

      {/* Main card */}
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-100 p-5 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">N</span>
            </div>
            <span className="font-semibold text-slate-700 text-[11px]">AI Assistant</span>
          </div>
          <span className="text-[10px] text-slate-400">Just now</span>
        </div>

        {/* Notification items */}
        <div className="flex flex-col gap-2.5">
          {[
            {
              icon: Inbox,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              title: 'New email linked',
              desc: 'LH8400 – Customs clearance update from Hartmann',
            },
            {
              icon: FileText,
              color: 'text-violet-600',
              bg: 'bg-violet-50',
              title: 'Case summary updated',
              desc: '#4821 – 3 new events, ETA unchanged, docs OK',
            },
            {
              icon: Zap,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              title: 'Draft ready for review',
              desc: 'Reply to Meridian Cargo re: SQ341 delay — 90% match',
            },
          ].map(item => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
              >
                <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={13} strokeWidth={1.5} className={item.color} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-[11px]">{item.title}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5 leading-snug">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Busywork() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — floating card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-sm mx-auto lg:mx-0"
          >
            <FloatingCard />
          </motion.div>

          {/* Right — text */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">AI Automation</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-snug">
              Less time on busywork. More time moving freight.
            </h2>
            <p className="text-slate-500 leading-relaxed">
              Nexio automatically links inbound emails to cases, generates AI summaries after each update, and prepares draft replies — so your team acts on information rather than processing it.
            </p>

            <div className="flex flex-col gap-4 mt-2">
              {[
                { title: 'Automatic email triage', desc: 'Every inbound email is matched to the right case instantly.' },
                { title: 'Summarised for you',     desc: 'AI digests multi-email threads into a two-line status update.' },
                { title: 'Draft with one click',   desc: 'Context-aware reply drafts, ready to approve and send.' },
              ].map(f => (
                <div key={f.title} className="flex gap-3">
                  <div className="w-1 h-full min-h-[40px] rounded-full bg-blue-100 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors duration-200 cursor-pointer mt-2 w-fit"
            >
              See automation in action <ArrowRight size={15} strokeWidth={2} />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
