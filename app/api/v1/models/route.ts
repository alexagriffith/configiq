import { NextRequest, NextResponse } from 'next/server'
import { fetchSupportedModels } from '@/lib/api/models'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source')

  try {
    if (source !== 'local') {
      const models = await fetchSupportedModels()
      return NextResponse.json(
        { success: true, data: { models, count: models.length }, source: 'aiconfigurator' },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
          }
        }
      )
    }
  } catch {
    // Fall through to local catalog
    
  }

}

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
