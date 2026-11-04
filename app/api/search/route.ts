import { NextResponse } from 'next/server'
import { searchTree } from '../../workbench/server'

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams
  const query = p.get('q') ?? ''
  if (!query || query.length > 200) return NextResponse.json([])
  return NextResponse.json(await searchTree(query, { caseSensitive: p.get('case') === '1', wholeWord: p.get('word') === '1', regex: p.get('regex') === '1' }))
}
