import { readTreeFile } from '../../workbench/server'

/** Contents of a file shown in the Explorer. Anything outside the tree is a 404. */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') ?? ''
  const text = readTreeFile(path)
  if (text === null) return new Response('Not found', { status: 404 })
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-cache' } })
}
