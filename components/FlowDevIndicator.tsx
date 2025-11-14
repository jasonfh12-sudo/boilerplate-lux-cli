'use client';

import { useEffect, useState } from 'react';


interface WebhookMapping {
  [endpoint: string]: {
    token: string;
    webhookUrl: string;
  };
}

interface CapturedPayload {
  endpoint: string;
  data: any;
  timestamp: string;
}

interface TooltipData {
  endpoint: string;
  flowId: string;
  webhookUrl: string;
  workflowName?: string;
  schema?: Record<string, any>;
  draftWebhookTrigger?: boolean;
  deployedWebhookTrigger?: boolean;
  lastPayload?: CapturedPayload;
  position: { x: number; y: number };
  loading?: boolean;
}

interface FlowInfoCache {
  workflowName: string;
  flowId: string;
  schema: Record<string, any> | null;
  draftWebhookTrigger: boolean;
  deployedWebhookTrigger: boolean;
}

export function FlowDevIndicator() {
  const [webhookMap, setWebhookMap] = useState<WebhookMapping>({});
  const [connectionCount, setConnectionCount] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [capturedPayloads, setCapturedPayloads] = useState<Map<string, CapturedPayload>>(new Map());
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [flowInfoCache, setFlowInfoCache] = useState<Map<string, FlowInfoCache>>(new Map());

  // Only run on localhost
  const isLocalhost = typeof window !== 'undefined' &&
    window.location.hostname.includes('localhost');

  useEffect(() => {
    setIsClient(true);

    if (!isLocalhost) return;

    // Fetch webhook mapping from API
    fetch('/api/flow-scanner')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('[Lux Flow Indicator] 📊 Found webhooks:', data.webhooks);
          setWebhookMap(data.webhooks);

          // Prefetch flow info for all webhooks
          Object.entries(data.webhooks).forEach(async ([endpoint, info]: [string, any]) => {
            try {
              const response = await fetch(`/api/flow-info/${info.token}`);
              if (response.ok) {
                const { data: flowData } = await response.json();
                setFlowInfoCache(prev => {
                  const newCache = new Map(prev);
                  newCache.set(endpoint, {
                    workflowName: flowData.workflowName,
                    flowId: flowData.flowId,
                    schema: flowData.schema,
                    draftWebhookTrigger: flowData.draftWebhookTrigger,
                    deployedWebhookTrigger: flowData.deployedWebhookTrigger,
                  });
                  return newCache;
                });
                console.log('[Lux Flow Indicator] ✅ Prefetched flow info for:', endpoint);
              }
            } catch (error) {
              console.error('[Lux Flow Indicator] Error prefetching flow info:', error);
            }
          });
        }
      })
      .catch(err => {
        console.error('[Lux Flow Indicator] Error fetching webhooks:', err);
      });

    // Intercept fetch calls to capture payloads
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;
      const urlString = typeof url === 'string' ? url : url.toString();

      // Check if this is a POST to one of our monitored endpoints
      if (options?.method === 'POST' && options?.body) {
        try {
          const bodyText = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
          const bodyData = JSON.parse(bodyText);

          // Store the payload
          setCapturedPayloads(prev => {
            const newMap = new Map(prev);
            newMap.set(urlString, {
              endpoint: urlString,
              data: bodyData,
              timestamp: new Date().toISOString()
            });
            return newMap;
          });

          console.log('[Lux Flow Indicator] 📦 Captured payload for:', urlString, bodyData);
        } catch (e) {
          // Ignore parse errors
        }
      }

      return originalFetch(...args);
    };

    return () => {
      // Restore original fetch
      window.fetch = originalFetch;
    };
  }, [isLocalhost]);

  useEffect(() => {
    if (!isLocalhost || Object.keys(webhookMap).length === 0) return;

    const scanAndAnnotate = () => {
      let count = 0;

      // Scan all elements with data-lux-endpoint attribute
      const elements = document.querySelectorAll('[data-lux-endpoint]');

      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;

        // Get endpoint from data attribute
        const endpoint = htmlEl.dataset.luxEndpoint;

        // Check if endpoint matches any webhook
        if (endpoint && webhookMap[endpoint]) {
          // Skip if already has badge
          if (htmlEl.dataset.luxBadgeAdded === 'true') {
            count++;
            return;
          }

          // Mark as annotated
          htmlEl.dataset.luxBadgeAdded = 'true';
          count++;

          // Make parent position relative if not already positioned
          const computedStyle = window.getComputedStyle(htmlEl);
          if (computedStyle.position === 'static') {
            htmlEl.style.position = 'relative';
          }

          // Create badge element - Lux Flows icon
          const badge = document.createElement('div');
          badge.className = 'lux-flow-badge';
          badge.style.cssText = `
            position: absolute;
            top: -6px;
            right: -6px;
            background: linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(124, 58, 237) 100%);
            color: white;
            font-size: 8px;
            font-weight: bold;
            width: 22px;
            height: 22px;
            border-radius: 9999px;
            box-shadow: 0 4px 8px -2px rgb(0 0 0 / 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            cursor: pointer;
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            border: 2px solid rgba(139, 92, 246, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
          `;
          // Lux Flows icon image
          badge.innerHTML = `
            <img src="/flow_image_bgout.png" alt="Flow" style="width: 14px; height: 14px; opacity: 0.95; pointer-events: none;" />
          `;

          // Add hover handler to show tooltip
          let hoverTimeout: NodeJS.Timeout | null = null;

          badge.addEventListener('mouseenter', async () => {
            badge.style.transform = 'scale(1.1)';
            badge.style.boxShadow = '0 6px 12px -2px rgb(0 0 0 / 0.4)';

            // Set this as the active endpoint
            setActiveEndpoint(endpoint);

            // Clear any pending hide timeout
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
              hoverTimeout = null;
            }

            const rect = badge.getBoundingClientRect();
            const payload = capturedPayloads.get(endpoint);
            const token = webhookMap[endpoint].token;

            // Check if we have cached data
            setFlowInfoCache((currentCache) => {
              const cachedInfo = currentCache.get(endpoint);

              if (cachedInfo) {
                // Use cached data immediately - no loading state!
                setTooltipData({
                  endpoint,
                  flowId: cachedInfo.flowId,
                  webhookUrl: webhookMap[endpoint].webhookUrl,
                  workflowName: cachedInfo.workflowName,
                  schema: cachedInfo.schema,
                  draftWebhookTrigger: cachedInfo.draftWebhookTrigger,
                  deployedWebhookTrigger: cachedInfo.deployedWebhookTrigger,
                  lastPayload: payload,
                  position: { x: rect.right + 10, y: rect.top },
                  loading: false,
                });
              } else {
                // Show loading state and fetch
                setTooltipData({
                  endpoint,
                  flowId: token,
                  webhookUrl: webhookMap[endpoint].webhookUrl,
                  lastPayload: payload,
                  position: { x: rect.right + 10, y: rect.top },
                  loading: true,
                });

                // Fetch if not cached
                fetch(`/api/flow-info/${token}`)
                  .then(res => res.json())
                  .then(({ data }) => {
                    setTooltipData({
                      endpoint,
                      flowId: data.flowId,
                      webhookUrl: webhookMap[endpoint].webhookUrl,
                      workflowName: data.workflowName,
                      schema: data.schema,
                      draftWebhookTrigger: data.draftWebhookTrigger,
                      deployedWebhookTrigger: data.deployedWebhookTrigger,
                      lastPayload: payload,
                      position: { x: rect.right + 10, y: rect.top },
                      loading: false,
                    });
                  })
                  .catch(error => {
                    console.error('[Lux Flow Indicator] Error fetching flow info:', error);
                    setTooltipData((prev) => prev ? { ...prev, loading: false } : null);
                  });
              }

              return currentCache;
            });
          });

          badge.addEventListener('mouseleave', () => {
            badge.style.transform = 'scale(1)';
            badge.style.boxShadow = '0 4px 8px -2px rgb(0 0 0 / 0.3)';

            // Hide tooltip after a delay (allows moving to tooltip)
            hoverTimeout = setTimeout(() => {
              // Only hide if not hovering over tooltip AND this is still the active endpoint
              setActiveEndpoint((currentActive) => {
                if (currentActive === endpoint) {
                  const tooltip = document.querySelector('[data-flow-tooltip]');
                  if (!tooltip || !tooltip.matches(':hover')) {
                    setTooltipData(null);
                    return null;
                  }
                }
                return currentActive;
              });
              hoverTimeout = null;
            }, 200);
          });

          // Add animation keyframes if not already added
          if (!document.getElementById('lux-flow-badge-styles')) {
            const style = document.createElement('style');
            style.id = 'lux-flow-badge-styles';
            style.textContent = `
              @keyframes pulse {
                0%, 100% {
                  opacity: 1;
                }
                50% {
                  opacity: .7;
                }
              }
            `;
            document.head.appendChild(style);
          }

          // Append badge to element
          htmlEl.appendChild(badge);

          console.log('[Lux Flow Indicator] 🔗 Badge added to:', {
            element: htmlEl.tagName,
            text: htmlEl.textContent?.substring(0, 50),
            endpoint: endpoint,
            token: webhookMap[endpoint].token
          });
        }
      });

      setConnectionCount(count);
      console.log('[Lux Flow Indicator] 📊 Scan complete:', count, 'connections');
    };

    // Initial scan
    scanAndAnnotate();

    // Watch for DOM changes (new elements added)
    const observer = new MutationObserver(() => {
      scanAndAnnotate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Re-scan periodically (for React re-renders that replace elements)
    const interval = setInterval(scanAndAnnotate, 1000);

    return () => {
      observer.disconnect();
      clearInterval(interval);

      // Clean up badges
      document.querySelectorAll('.lux-flow-badge').forEach(badge => badge.remove());
    };
  }, [webhookMap, isLocalhost]);

  if (!isClient || !isLocalhost) return null;

  return (
    <>
      {/* Status indicator */}
      <div className="fixed bottom-4 right-4 z-[9999] font-mono text-xs">
        {Object.keys(webhookMap).length > 0 ? (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-2xl p-3 border-2 border-purple-400">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="font-bold">Lux Flow Monitor</span>
            </div>
            <div className="text-purple-200 text-[10px]">
              {Object.keys(webhookMap).length} webhook(s) detected
              <br />
              {connectionCount} connection(s) found
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 text-slate-300 rounded-lg shadow-lg px-3 py-2 border border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span>Scanning for Flows...</span>
            </div>
          </div>
        )}
      </div>

      {/* Flow Tooltip */}
      {tooltipData && (
        <div
          data-flow-tooltip
          className="fixed z-[10000] bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 max-w-md"
          style={{
            top: `${tooltipData.position.y}px`,
            left: `${tooltipData.position.x}px`,
          }}
          onMouseEnter={() => {
            // Keep tooltip visible when hovering over it
            // Ensure the active endpoint matches the current tooltip
            setActiveEndpoint(tooltipData.endpoint);
          }}
          onMouseLeave={() => {
            // Hide tooltip when mouse leaves (with small delay to allow re-entry)
            setTimeout(() => {
              const tooltip = document.querySelector('[data-flow-tooltip]');
              if (!tooltip || !tooltip.matches(':hover')) {
                setTooltipData(null);
                setActiveEndpoint(null);
              }
            }, 100);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
            <img src="/flow_image_bgout.png" alt="Flow" className="w-5 h-5" />
            <span className="font-semibold text-sm">Flow Connection</span>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 text-xs max-h-[60vh] overflow-y-auto">
            {/* Connected Flow */}
            <div>
              <div className="text-slate-400 mb-1.5 font-semibold uppercase text-[10px] tracking-wide">Connected Flow</div>
              <div className="bg-slate-800 rounded px-3 py-2">
                {tooltipData.loading ? (
                  <span className="text-slate-400 animate-pulse">Loading...</span>
                ) : (
                  <>
                    {/* Workflow Name */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-white text-sm font-semibold">
                        {tooltipData.workflowName || 'Unknown Workflow'}
                      </span>
                      <a
                        href={`${window.location.protocol}//${window.location.hostname}/app/workflows/${tooltipData.flowId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex-shrink-0"
                        title="Open in Lux"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                    {/* Flow ID */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-400 text-[10px] truncate">
                        {tooltipData.flowId}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(tooltipData.flowId)}
                        className="text-slate-500 hover:text-slate-300 flex-shrink-0"
                        title="Copy Flow ID"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Webhook Trigger Status */}
            {!tooltipData.loading && (
              <div>
                <div className="text-slate-400 mb-1 font-semibold uppercase text-[10px] tracking-wide">Webhook Trigger</div>
                <div className="space-y-1.5">
                  {/* Draft Status */}
                  <div className="flex items-center justify-between bg-slate-800 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${tooltipData.draftWebhookTrigger ? 'bg-yellow-400' : 'bg-slate-600'}`} />
                      <span className="text-[11px] text-slate-300">Draft Config</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${tooltipData.draftWebhookTrigger ? 'text-yellow-400' : 'text-slate-500'}`}>
                      {tooltipData.draftWebhookTrigger ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  {/* Deployed Status */}
                  <div className="flex items-center justify-between bg-slate-800 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${tooltipData.deployedWebhookTrigger ? 'bg-green-400' : 'bg-slate-600'}`} />
                      <span className="text-[11px] text-slate-300">Deployed Config</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${tooltipData.deployedWebhookTrigger ? 'text-green-400' : 'text-slate-500'}`}>
                      {tooltipData.deployedWebhookTrigger ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook Schema */}
            {tooltipData.loading ? (
              <div className="bg-slate-800 rounded px-3 py-2">
                <span className="text-slate-400 animate-pulse">Loading schema...</span>
              </div>
            ) : tooltipData.schema ? (
              <div>
                <div className="text-slate-400 mb-1 font-semibold uppercase text-[10px] tracking-wide">Webhook Schema</div>
                <div className="bg-slate-800 rounded px-3 py-2 space-y-2">
                  {Object.entries(tooltipData.schema).map(([key, fieldInfo]: [string, any]) => (
                    <div key={key} className="border-l-2 border-emerald-500 pl-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-emerald-400 font-mono text-[11px] font-semibold">{key}</span>
                        <span className="text-slate-500 text-[10px]">({fieldInfo.type || 'unknown'})</span>
                      </div>
                      {fieldInfo.description && (
                        <div className="text-slate-400 text-[10px] mb-1">
                          {fieldInfo.description}
                        </div>
                      )}
                      {fieldInfo.example && (
                        <div className="text-slate-400 text-[10px] font-mono">
                          Example: {JSON.stringify(fieldInfo.example)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-slate-500 text-[10px] mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Schema from database
                </div>
              </div>
            ) : tooltipData.lastPayload ? (
              <div>
                <div className="text-slate-400 mb-1 font-semibold uppercase text-[10px] tracking-wide">Captured Payload</div>
                <div className="bg-slate-800 rounded px-3 py-2 space-y-2">
                  {Object.entries(tooltipData.lastPayload.data).map(([key, value]) => (
                    <div key={key} className="border-l-2 border-yellow-500 pl-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-yellow-400 font-mono text-[11px] font-semibold">{key}</span>
                        <span className="text-slate-500 text-[10px]">({typeof value})</span>
                      </div>
                      <div className="text-slate-400 text-[10px] font-mono">
                        Example: {JSON.stringify(value)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-yellow-500 text-[10px] mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  No schema defined - showing captured payload
                </div>
              </div>
            ) : (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded px-3 py-2 text-yellow-400 text-[11px]">
                <strong>No webhook schema configured.</strong>
                <div className="text-yellow-500 text-[10px] mt-1">
                  Configure the webhook schema in the Flow builder or trigger this element to capture the payload format.
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded px-3 py-2 text-blue-300 text-[10px] leading-relaxed">
              <strong>Dev mode only:</strong> This indicator won't appear in production
            </div>
          </div>
        </div>
      )}
    </>
  );
}
