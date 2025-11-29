'use client';

import { useEffect } from 'react';

/**
 * DevTools Tracker
 *
 * Tracks user interactions and sends them to Lux Studio for debugging.
 * This component should be included in the root layout.
 */
export function DevToolsTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('[DevTools] Initializing execution tracker');

    // Helper to find React Fiber node
    function findReactFiber(element: any) {
      for (let key in element) {
        if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
          return element[key];
        }
      }
      return null;
    }

    // Helper to get component name from fiber
    function getComponentName(fiber: any): string {
      if (!fiber) return 'Unknown';

      let current = fiber;
      while (current) {
        if (current.type && typeof current.type === 'function') {
          return current.type.name || current.type.displayName || 'Anonymous';
        }
        if (current.type && typeof current.type === 'string') {
          return current.type;
        }
        current = current.return;
      }
      return 'Unknown';
    }

    // Track clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const className = typeof target.className === 'string' ? target.className : (target.className as any)?.baseVal || '';

      // Try to find React component
      const fiber = findReactFiber(target);
      const componentName = getComponentName(fiber);

      const clickData = {
        tagName,
        componentName,
        className,
        id: target.id || '',
        timestamp: Date.now(),
        text: target.textContent?.substring(0, 50) || ''
      };

      console.log('[LUX_DEV_TOOLS_CLICK]' + JSON.stringify(clickData));
    };

    document.body.addEventListener('click', handleClick, true);

    console.log('[DevTools] Tracker initialized successfully');

    return () => {
      document.body.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}
