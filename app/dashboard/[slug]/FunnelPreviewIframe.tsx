'use client'

import { useEffect, useRef, useState } from 'react'

export default function FunnelPreviewIframe({ src, title }: { src: string; title: string }) {
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
    <iframe
      ref={iframeRef}
      src={src}
      style={{ height }}
      className="w-full border-0 block transition-[height] duration-200"
      title={title}
    />
  )
}
