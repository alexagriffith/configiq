// GET /api/v1/gpus
// GPU catalog endpoint — tries AIConfigurator first, falls back to local catalog + Cloudflare pricing

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiErrors } from '@/lib/api/errors'
import { fetchHardwareList, fetchHardwareSpec } from '@/lib/api/gpus'

export async function GET(req: NextRequest) {
  try {
    // ── AIConfigurator path (default) ──────────────────────────────────────
    // Try AIC first unless the caller explicitly requests local data
    try {
        console.log('[GPUs API] Fetching hardware list from AIConfigurator...')
        const systems = await fetchHardwareList()
        console.log(`[GPUs API] Received ${systems.length} systems from AIConfigurator`)

        const specs = await Promise.all(systems.map(s => fetchHardwareSpec(s)))
        console.log(`[GPUs API] Fetched specs for ${specs.length} systems`)

        return NextResponse.json(
          { success: true, data: { gpus: specs, count: specs.length }, source: 'aiconfigurator' },
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400'
            }
          }
        )
    } catch (aicError) {
      // Fall through to local catalog
      console.error('[GPUs API] AIConfigurator unavailable.', aicError)
      throw aicError
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        ApiErrors.VALIDATION_ERROR(error.issues),
        { status: 400 }
      )
    }
    return NextResponse.json(
      ApiErrors.INTERNAL_ERROR('Failed to fetch GPU catalog'),
      { status: 500 }
    )
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
