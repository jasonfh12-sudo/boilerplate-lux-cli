'use client';

import { useEffect, useState } from 'react';
import { initBrowserTracer } from '@/lib/browser-tracer';

export function TracingProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('🔌 [TracingProvider] Component mounted');
    setMounted(true);

    try {
      console.log('🚀 [TracingProvider] Calling initBrowserTracer...');
      initBrowserTracer();
      console.log('✅ [TracingProvider] initBrowserTracer completed');
    } catch (error) {
      console.error('❌ [TracingProvider] Failed to initialize browser tracer:', error);
    }
  }, []);

  return <>{children}</>;
}
