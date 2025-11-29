'use client';

import { useEffect } from 'react';

/**
 * DevTools Tracker - Comprehensive interaction tracking
 *
 * Captures:
 * - Click/input events with full context
 * - State changes (React state tracking)
 * - DOM snapshots (before/after)
 * - DOM mutations
 * - Execution timing
 * - Component hierarchy
 */
export function DevToolsTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('[DevTools] Initializing comprehensive tracker');

    // Store for tracking state changes
    const stateSnapshots: Record<string, any> = {};
    let domSnapshotBefore: string | null = null;
    let mutationRecords: MutationRecord[] = [];
    let isTracking = false;

    // Helper to get React Fiber node
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

    // Helper to extract React state from component
    function extractComponentState(fiber: any): Record<string, any> {
      const state: Record<string, any> = {};

      if (!fiber) return state;

      try {
        // Look for hooks (useState, useReducer, etc.)
        let currentFiber = fiber;
        while (currentFiber) {
          if (currentFiber.memoizedState) {
            let hook = currentFiber.memoizedState;
            let hookIndex = 0;

            while (hook) {
              // Extract state value
              if (hook.hasOwnProperty('baseState')) {
                state[`hook_${hookIndex}`] = hook.baseState;
              }
              hook = hook.next;
              hookIndex++;
            }
          }

          // Also check for class component state
          if (currentFiber.stateNode && currentFiber.stateNode.state) {
            state.classState = currentFiber.stateNode.state;
          }

          currentFiber = currentFiber.return;
        }
      } catch (e) {
        console.error('[DevTools] Error extracting state:', e);
      }

      return state;
    }

    // Helper to capture DOM snapshot
    function captureDOMSnapshot(element: HTMLElement): string {
      try {
        // Get a reasonable parent scope for the snapshot
        let snapshotRoot = element;
        let depth = 0;
        while (snapshotRoot.parentElement && depth < 3) {
          snapshotRoot = snapshotRoot.parentElement;
          depth++;
        }

        // Clone and clean the HTML
        const cloned = snapshotRoot.cloneNode(true) as HTMLElement;

        // Remove scripts and other unnecessary elements
        cloned.querySelectorAll('script, style, link').forEach(el => el.remove());

        return cloned.outerHTML;
      } catch (e) {
        console.error('[DevTools] Error capturing DOM snapshot:', e);
        return '<div>Error capturing snapshot</div>';
      }
    }

    // Helper to track DOM mutations
    const mutationObserver = new MutationObserver((mutations) => {
      if (isTracking) {
        mutationRecords.push(...mutations);
      }
    });

    // Start observing the entire body for mutations
    mutationObserver.observe(document.body, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: true,
      characterDataOldValue: true
    });

    // Helper to process DOM changes
    function processDOMChanges(mutations: MutationRecord[]): any[] {
      const changes: any[] = [];

      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // Added nodes
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const elem = node as HTMLElement;
              changes.push({
                type: 'added',
                tagName: elem.tagName.toLowerCase(),
                className: elem.className,
                textContent: elem.textContent?.substring(0, 50)
              });
            }
          });

          // Removed nodes
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const elem = node as HTMLElement;
              changes.push({
                type: 'removed',
                tagName: elem.tagName.toLowerCase(),
                className: elem.className,
                textContent: elem.textContent?.substring(0, 50)
              });
            }
          });
        } else if (mutation.type === 'attributes') {
          const elem = mutation.target as HTMLElement;
          changes.push({
            type: 'modified',
            tagName: elem.tagName.toLowerCase(),
            attribute: mutation.attributeName,
            oldValue: mutation.oldValue,
            newValue: elem.getAttribute(mutation.attributeName || '')
          });
        }
      });

      return changes;
    }

    // Helper to extract handler code
    function extractHandlerCode(element: HTMLElement, eventType: string): string {
      try {
        // Try to get the actual function
        const handler = (element as any)[eventType];
        if (handler && typeof handler === 'function') {
          return handler.toString();
        }

        // Try React props
        const fiber = findReactFiber(element);
        if (fiber && fiber.memoizedProps && fiber.memoizedProps[eventType]) {
          const fn = fiber.memoizedProps[eventType];
          if (typeof fn === 'function') {
            return fn.toString();
          }
        }

        return '';
      } catch (e) {
        return '';
      }
    }

    // Track all interactions
    const trackInteraction = async (e: Event) => {
      const target = e.target as HTMLElement;
      const eventType = e.type;

      // Skip if not a meaningful interaction
      if (!target || target === document || target === document.body) return;

      console.log('[DevTools] Tracking interaction:', eventType, target);

      // Start tracking
      isTracking = true;
      mutationRecords = [];

      // Capture before state
      const fiber = findReactFiber(target);
      const componentName = getComponentName(fiber);
      const stateBefore = extractComponentState(fiber);
      domSnapshotBefore = captureDOMSnapshot(target);

      // Mark the start time
      const startTime = performance.now();

      // Let the event process
      setTimeout(() => {
        // Capture after state (after React has re-rendered)
        const stateAfter = extractComponentState(fiber);
        const domSnapshotAfter = captureDOMSnapshot(target);
        const endTime = performance.now();

        // Process DOM changes
        const domChanges = processDOMChanges(mutationRecords);

        // Calculate state diff
        const stateDiff: any[] = [];
        const allKeys = new Set([...Object.keys(stateBefore), ...Object.keys(stateAfter)]);
        allKeys.forEach(key => {
          if (JSON.stringify(stateBefore[key]) !== JSON.stringify(stateAfter[key])) {
            stateDiff.push({
              key,
              before: stateBefore[key],
              after: stateAfter[key]
            });
          }
        });

        // Extract handler code
        const handlerCode = extractHandlerCode(target, `on${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`);

        // Build comprehensive tracking data
        const trackingData = {
          eventType,
          componentName,
          tagName: target.tagName.toLowerCase(),
          className: typeof target.className === 'string' ? target.className : '',
          id: target.id || '',
          timestamp: Date.now(),
          text: target.textContent?.substring(0, 50) || '',

          // Handler info
          handlerCode,
          handlerName: handlerCode ? (handlerCode.match(/function\s+(\w+)/) || ['', 'anonymous'])[1] : 'inline',

          // State changes
          stateDiff: stateDiff.length > 0 ? stateDiff : null,

          // DOM snapshots
          domSnapshotBefore,
          domSnapshotAfter,

          // DOM changes
          domChanges: domChanges.length > 0 ? domChanges : null,

          // Execution timing
          executionTime: endTime - startTime,

          // Additional context
          path: getElementPath(target),
          viewportPosition: {
            x: e instanceof MouseEvent ? e.clientX : 0,
            y: e instanceof MouseEvent ? e.clientY : 0
          }
        };

        // Send to parent via console (Electron will capture this)
        console.log('[LUX_DEV_TOOLS_EVENT]' + JSON.stringify(trackingData));

        // Stop tracking
        isTracking = false;
      }, 100); // Wait for React to re-render
    };

    // Helper to get element path
    function getElementPath(element: HTMLElement): string {
      const path: string[] = [];
      let current: HTMLElement | null = element;

      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          selector += '#' + current.id;
        } else if (current.className) {
          const classes = typeof current.className === 'string'
            ? current.className.split(' ').filter(c => c).join('.')
            : '';
          if (classes) selector += '.' + classes;
        }
        path.unshift(selector);
        current = current.parentElement;
      }

      return path.join(' > ');
    }

    // Attach event listeners for all interaction types
    const eventTypes = ['click', 'input', 'change', 'focus', 'blur', 'submit'];
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, trackInteraction, true);
    });

    // Expose state setter for testing
    (window as any).__luxDevToolsSetState = (key: string, value: any) => {
      console.log('[DevTools] State setter called:', key, value);
      // This would need to be implemented based on your state management
    };

    // Expose state getter
    (window as any).__luxDevToolsState = stateSnapshots;

    console.log('[DevTools] Comprehensive tracker initialized');

    return () => {
      // Cleanup
      eventTypes.forEach(eventType => {
        document.removeEventListener(eventType, trackInteraction, true);
      });
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}