'use client'

import { motion } from 'framer-motion'

const FOOTER_NAV = {
  Product:  ['Workbench', 'Tracking', 'AI Routing', 'Integrations', 'Changelog'],
  Company:  ['About', 'Careers', 'Press', 'Contact'],
  Legal:    ['Privacy', 'Terms', 'Security', 'Cookie Policy'],
  Resources: ['Documentation', 'API Reference', 'Status', 'Blog'],
}

export default function Footer() {
  return (
    <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="col-span-2 md:col-span-1"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="font-bold text-white text-lg tracking-tight">Nexio</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              The nexus of freight forwarding. Built for operations teams who move fast.
            </p>
          </motion.div>

          {/* Nav columns */}
          {Object.entries(FOOTER_NAV).map(([group, links], gi) => (
            <motion.div
              key={group}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: gi * 0.07 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">{group}</p>
              <ul className="flex flex-col gap-2.5">
                {links.map(link => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Nexio Technologies Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Cookies'].map(l => (
              <a
                key={l}
                href="#"
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors duration-200 cursor-pointer"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
