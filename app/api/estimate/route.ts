import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_TIMEOUT_SECONDS = 90

export async function POST(req: NextRequest) {
  const baseUrl = process.env.AICONFIGURATOR_API_URL
  const timeoutSeconds =
    parseInt(process.env.AICONFIGURATOR_TIMEOUT_SECONDS || '', 10) ||
    DEFAULT_TIMEOUT_SECONDS

  if (!baseUrl) {
    return NextResponse.json(
      { status: 'failed', error: { code: 'AIC_NOT_CONFIGURED', message: 'AIConfigurator API URL is not configured' } },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(req.url)
  const include = searchParams.get('include')
  const aicUrl = include
    ? `${baseUrl}/estimate?include=${encodeURIComponent(include)}`
    : `${baseUrl}/estimate`

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { status: 'failed', error: { code: 'INVALID_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  try {
    const res = await fetch(aicUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    })

    const text = await res.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { status: 'failed', error: { code: 'AIC_INVALID_RESPONSE', message: 'AIConfigurator returned non-JSON response' } },
        { status: 502 },
      )
    }

    return NextResponse.json(data, {
      status: res.ok ? 200 : res.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return NextResponse.json(
        { status: 'failed', error: { code: 'AIC_TIMEOUT', message: 'AIConfigurator API timed out' } },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { status: 'failed', error: { code: 'AIC_UNAVAILABLE', message: 'AIConfigurator API is unreachable' } },
      { status: 502 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
