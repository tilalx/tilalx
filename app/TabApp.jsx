'use client'

import { useState, useEffect } from 'react'
import { Box } from '@mui/material'
import HomeContent from './HomeContent'
import MemeClient from './MemeClient'
import QuotesClient from './QuotesClient'

const HASHES = ['#home', '#memes', '#quotes']

function getTab(hash) {
  const idx = HASHES.indexOf(hash.toLowerCase())
  return idx >= 0 ? idx : 0
}

export default function TabApp({ markdown, initialQuote, initialMeme }) {
  const [tab, setTab] = useState(0)

  useEffect(() => {
    setTab(getTab(window.location.hash))
    const handler = () => setTab(getTab(window.location.hash))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  return (
    <Box>
      <div hidden={tab !== 0}><HomeContent markdown={markdown} /></div>
      <div hidden={tab !== 1}><MemeClient initialUrl={initialMeme} /></div>
      <div hidden={tab !== 2}><QuotesClient initialQuote={initialQuote} /></div>
    </Box>
  )
}
