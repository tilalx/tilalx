'use client'

import { useEffect } from 'react'
import ReactGA from 'react-ga4'
import { usePathname } from 'next/navigation'

export default function Track() {
  const pathname = usePathname()

  useEffect(() => {
    ReactGA.initialize('G-WWE5E8N7QH')
  }, [])

  useEffect(() => {
    ReactGA.send({ hitType: 'pageview', page: pathname })
  }, [pathname])

  useEffect(() => {
    fetch('https://n8n.aelx.de/webhook/ip')
      .then((r) => r.json())
      .then((data) => sessionStorage.setItem('track', JSON.stringify(data)))
      .catch(() => {})
  }, [])

  return null
}
