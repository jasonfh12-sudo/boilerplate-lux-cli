'use client';

import { useEffect } from 'react';
import { getBrowserTracer } from '@/lib/browser-tracer';

export default function TestTracePage() {
  useEffect(() => {
    console.log('🧪 [Test Page] Mounted, checking browser tracer...');

    try {
      const tracer = getBrowserTracer('test-page');
      console.log('✅ [Test Page] Got tracer:', tracer);

      // Create a manual test span
      const span = tracer.startSpan('manual-test-click');
      span.setAttribute('test.attribute', 'hello from browser');
      console.log('📍 [Test Page] Created test span');

      setTimeout(() => {
        span.end();
        console.log('✅ [Test Page] Ended test span');
      }, 100);
    } catch (error) {
      console.error('❌ [Test Page] Error creating test span:', error);
    }
  }, []);

  const handleClick = () => {
    console.log('🖱️ [Test Page] Button clicked!');

    try {
      const tracer = getBrowserTracer('test-page');
      const span = tracer.startSpan('button-click');
      span.setAttribute('button.name', 'test-button');
      span.setAttribute('click.timestamp', Date.now());

      setTimeout(() => {
        span.end();
        console.log('✅ [Test Page] Button click span ended');
      }, 50);
    } catch (error) {
      console.error('❌ [Test Page] Error in click handler:', error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Browser Trace Test Page</h1>
      <p className="mb-4">Open the browser console to see trace logs</p>
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Click Me to Generate Browser Trace
      </button>
    </div>
  );
}
