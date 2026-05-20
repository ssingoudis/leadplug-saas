'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function SuccessPreviewBlock({ src, title = 'Erfolgsmeldung (Success-Screen)', defaultOpen = false }: { src: string; title?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [height, setHeight] = useState(400)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== 'funnel-resize') return
      if (e.source !== iframeRef.current?.contentWindow) return
      const h = parseInt(e.data.height, 10)
      if (h > 0) setHeight(h)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      >
        <span className="text-base font-bold text-gray-900 dark:text-white">{title}</span>
        <span className="text-gray-400 dark:text-gray-500">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <iframe
            ref={iframeRef}
            src={src}
            style={{ height }}
            className="w-full border-0 block transition-[height] duration-200"
            title="Success-Screen"
          />
        </div>
      )}
    </div>
  )
}
