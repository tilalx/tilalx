import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { year: yearParam } = await params
  const currentYear = new Date().getFullYear()
  const year = parseInt(yearParam, 10)
  if (!year || year < 2010 || year > currentYear) {
    return NextResponse.json(null, { status: 400 })
  }

  const isPast = year < currentYear
  const revalidate = isPast ? 31536000 : 3600

  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/tilalx?y=${year}`,
      { next: { revalidate } }
    )
    if (!res.ok) return NextResponse.json(null, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': isPast
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch {
    return NextResponse.json(null, { status: 500 })
  }
}
