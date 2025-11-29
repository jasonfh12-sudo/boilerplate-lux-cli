import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { CompositePropagator } from '@opentelemetry/core';

console.log('🔧 [Node Instrumentation] Initializing OpenTelemetry SDK...');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'lux-interface',
  }),
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
    })
  ),
  textMapPropagator: new CompositePropagator({
    propagators: [new W3CTraceContextPropagator()],
  }),
});

sdk.start();

console.log('📤 [Node Instrumentation] Exporting traces to http://localhost:4318/v1/traces');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('🛑 [Node Instrumentation] Tracing terminated'))
    .catch((error) => console.log('❌ [Node Instrumentation] Error terminating tracing', error))
    .finally(() => process.exit(0));
});
