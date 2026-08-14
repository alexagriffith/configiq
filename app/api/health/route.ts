import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl = process.env.AICONFIGURATOR_API_URL || 'http://localhost:7860';

    // Check if AIConfigurator API is reachable
    const apiResponse = await fetch(`${apiUrl}/systems`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      return NextResponse.json(
        {
          status: 'degraded',
          message: 'API connectivity issue',
          api_status: apiResponse.status,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        message: 'ConfigIQ webapp is running',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    );
  }
}
