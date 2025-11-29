import { NextRequest, NextResponse } from 'next/server';

// Proxy endpoint to forward browser traces to Jaeger
// This avoids CORS issues when browser tries to send traces directly
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Forward to Jaeger OTLP HTTP endpoint
    const response = await fetch('http://localhost:4318/v1/traces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      console.error('[Traces Proxy] Failed to forward to Jaeger:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to forward traces' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Traces Proxy] Error forwarding traces:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
