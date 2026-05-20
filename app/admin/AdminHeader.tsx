'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Plus, Power, Menu, X, LayoutDashboard } from 'lucide-react'

export default function AdminHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const tabs = [
    { label: 'Funnels', href: '/admin' },
    { label: 'Leads', href: '/admin/leads' },
  ]

  return (
    <div className="bg-white sticky top-0 z-10 border-b-2 border-[#4648d4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-0 flex items-stretch gap-0">
        {/* Tabs */}
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`flex items-center px-4 py-4 text-sm border-b-2 -mb-0.5 transition-colors ${
                active
                  ? 'font-semibold text-[#4648d4] border-[#4648d4]'
                  : 'font-medium text-gray-500 hover:text-gray-900 border-transparent'
              }`}
            >
              {tab.label}
            </a>
          )
        })}

        {/* Desktop actions */}
        <div className="ml-auto hidden sm:flex items-center gap-2 py-3">
          <a
            href="/admin/new"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#4648d4] text-white hover:bg-[#3537b0] transition-colors"
          >
            <Plus size={14} />
            Neuer Kunde
          </a>
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-[#4648d4] hover:text-[#4648d4] transition-colors"
          >
            <LayoutDashboard size={14} />
            Mein Dashboard
          </a>
          <a
            href="/logout"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-[#4648d4] hover:text-[#4648d4] transition-colors"
          >
            <Power size={14} />
            Logout
          </a>
        </div>

        {/* Mobile hamburger */}
        <div className="ml-auto flex sm:hidden items-center py-3">
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menü öffnen"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:border-[#4648d4] hover:text-[#4648d4] transition-colors cursor-pointer"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-gray-100 bg-white py-1">
          <a
            href="/admin/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-[#4648d4] hover:bg-gray-50 transition-colors"
          >
            <Plus size={15} />
            Neuer Kunde
          </a>
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LayoutDashboard size={15} />
            Mein Dashboard
          </a>
          <div className="mx-6 border-t border-gray-100" />
          <a
            href="/logout"
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Power size={15} />
            Logout
          </a>
        </div>
      )}
    </div>
  )
}
