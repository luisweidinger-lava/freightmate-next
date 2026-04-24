'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Product',  href: '#' },
  { label: 'Solutions', href: '#' },
  { label: 'Pricing',  href: '#' },
  { label: 'Company',  href: '#' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)

  useEffect(() => {
    const el = document.querySelector('.fixed.inset-0.overflow-y-auto') ?? window
    const handler = () => {
      const top = el instanceof Window ? el.scrollY : (el as Element).scrollTop
      setScrolled(top > 20)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/nexio" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-tight">N</span>
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">Nexio</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200 cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <a href="#" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200 cursor-pointer px-4 py-2">
            Sign in
          </a>
          <a
            href="#"
            className="text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            Request a Demo
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="md:hidden p-2 text-slate-700 hover:text-slate-900 cursor-pointer"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white border-b border-slate-100 px-6 pb-6 pt-2 flex flex-col gap-4"
        >
          {NAV_LINKS.map(link => (
            <a key={link.label} href={link.href} className="text-sm font-medium text-slate-700 hover:text-slate-900 cursor-pointer">
              {link.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <a href="#" className="text-sm font-medium text-slate-700 cursor-pointer">Sign in</a>
            <a href="#" className="text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 px-4 py-2.5 rounded-lg text-center transition-colors duration-200 cursor-pointer">
              Request a Demo
            </a>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
