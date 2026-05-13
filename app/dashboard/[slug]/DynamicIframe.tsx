'use client'

import { useEffect, useState } from 'react'

interface DynamicIframeProps {
  src: string
  messageType: string
  minHeight: number
  title: string
  className?: string
}

export default function DynamicIframe({ src, messageType, minHeight, title, className = '' }: DynamicIframeProps) {
  const [height, setHeight] = useState(minHeight)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== messageType) return
      const h = parseInt(e.data.height, 10)
      if (h > 0) setHeight(h)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [messageType])

  return (
    <iframe
      src={src}
      style={{ height }}
      className={`w-full border-0 block transition-[height] duration-200 ${className}`}
      title={title}
    />
  )
}
