// GET /api/gpus
// GPU catalog endpoint with filtering + live pricing from Cloudflare Worker

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiErrors } from '@/lib/api/errors'
import { fetchHardwareDetailed } from '@/lib/api/gpus'

export async function GET(req: NextRequest) {
  try {
    // ── AIConfigurator path (default) ──────────────────────────────────────
    // Try AIC first unless the caller explicitly requests local data
    try {
        console.log('[GPUs API] Fetching hardware list from AIConfigurator...')
        const gpus = await fetchHardwareDetailed()
        console.log(`[GPUs API] Received ${gpus.length} systems from AIConfigurator`)

        return NextResponse.json(
          { success: true, data: { gpus, count: gpus.length }, source: 'aiconfigurator' },
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
