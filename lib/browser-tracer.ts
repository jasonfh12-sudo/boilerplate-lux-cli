import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { trace } from '@opentelemetry/api';

let isInitialized = false;

export function initBrowserTracer() {
  // Only run in browser
  if (typeof window === 'undefined') {
    console.log('❌ [Browser Tracer] Not in browser environment, skipping');
    return;
  }

  // Only initialize once
  if (isInitialized) {
    console.log('ℹ️ [Browser Tracer] Already initialized');
    return;
  }

  console.log('🌐 [Browser Tracer] Initializing browser instrumentation...');
  console.log('📍 [Browser Tracer] Running in browser:', window.location.href);

  try {
    // Configure exporter to send to our proxy endpoint (avoids CORS issues)
    const exporter = new OTLPTraceExporter({
      url: '/api/traces',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📤 [Browser Tracer] Configured OTLP exporter to /api/traces (proxy to Jaeger)');

    // Create span processor
    const spanProcessor = new BatchSpanProcessor(exporter);

    // Create provider with proper configuration
    const provider = new WebTracerProvider({
      spanProcessors: [spanProcessor],
      resource: {
        attributes: {
          'service.name': 'lux-interface-browser',
        },
      },
    } as any);

    console.log('✅ [Browser Tracer] Provider created with span processor');

    // Register provider with context manager
    provider.register({
      contextManager: new ZoneContextManager(),
      propagator: new W3CTraceContextPropagator(),
    });

    // Register instrumentations
    registerInstrumentations({
      tracerProvider: provider,
      instrumentations: [
        // Instrument fetch calls - THIS IS THE KEY FOR PROPAGATION
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: /.*/,  // Propagate to all URLs
          clearTimingResources: true,
          applyCustomAttributesOnSpan: (span, request, response) => {
            span.setAttribute('http.url', request.url);
            span.setAttribute('http.method', request.method);
            if (response) {
              span.setAttribute('http.status_code', response.status);
            }
          },
        }),
        // Track user interactions (clicks, etc)
        new UserInteractionInstrumentation({
          eventNames: ['click', 'submit'],
        }),
        // Track page loads
        new DocumentLoadInstrumentation(),
      ],
    });

    isInitialized = true;
    console.log('✅ [Browser Tracer] Browser instrumentation initialized!');
    console.log('📤 [Browser Tracer] Exporting traces to http://localhost:4318/v1/traces');
  } catch (error) {
    console.error('❌ [Browser Tracer] Failed to initialize:', error);
  }
}

// Export tracer getter
export function getBrowserTracer(name: string = 'browser') {
  return trace.getTracer(name);
}
