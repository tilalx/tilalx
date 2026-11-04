import { NextResponse } from 'next/server'
import { fetchMemes, fetchQuotes } from '../../../workbench/server'

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  if (name === 'memes')  return NextResponse.json(await fetchMemes())
  if (name === 'quotes') return NextResponse.json(await fetchQuotes())
  return NextResponse.json(null, { status: 404 })
}
