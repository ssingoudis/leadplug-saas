'use client'

import { useState } from 'react'
import { Settings, Power, Menu, X } from 'lucide-react'
import TabNav from './TabNav'

export default function DashboardHeader() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white sticky top-0 z-10 border-b-2 border-[#4648d4]">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-0 flex items-stretch gap-0">
        {/* Tabs */}
        <TabNav />

        {/* Desktop actions */}
        <div className="ml-auto hidden sm:flex items-center gap-2 py-3">
          <a
            href="/dashboard/account"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#4648d4] text-white hover:bg-[#3537b0] transition-colors"
          >
            <Settings size={14} />
            Account
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
            href="/dashboard/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-[#4648d4] hover:bg-gray-50 transition-colors"
          >
            <Settings size={15} />
            Account
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
