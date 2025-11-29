export async function register() {
  console.log('🎬 [Instrumentation] register() called!');

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('📦 [Instrumentation] Loading Node.js instrumentation...');
    await import('./instrumentation.node');
  }

  console.log('✅ [Instrumentation] OpenTelemetry registered successfully!');
}
