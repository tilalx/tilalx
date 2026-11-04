import { NextResponse } from 'next/server'
import { fetchMemes, fetchQuotes } from '../../../workbench/server'
import { MEME_SUBREDDITS } from '../../../workbench/paths'

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  if (name === 'memes') {
    const sub = new URL(req.url).searchParams.get('sub')
    return NextResponse.json(await fetchMemes(30, MEME_SUBREDDITS.find(s => s === sub)))
  }
  if (name === 'quotes') return NextResponse.json(await fetchQuotes())
  return NextResponse.json(null, { status: 404 })
}
