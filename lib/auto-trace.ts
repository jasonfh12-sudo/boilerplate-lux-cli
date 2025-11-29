import { trace, context, Span } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';

// Store original Error.prepareStackTrace to get call stack
const originalPrepareStackTrace = Error.prepareStackTrace;

/**
 * Get the current file path and function name from the call stack
 */
function getCallerInfo(): { filepath: string; functionName: string } | null {
  const oldPrepare = Error.prepareStackTrace;

  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = new Error().stack as unknown as NodeJS.CallSite[];

    if (!stack || stack.length < 4) return null;

    // Skip this function and the wrapper
    const caller = stack[3];
    const filename = caller.getFileName();
    const functionName = caller.getFunctionName() || 'anonymous';

    if (!filename) return null;

    // Make path relative to project root
    const filepath = filename.replace(process.cwd() + '/', '');

    return { filepath, functionName };
  } catch (e) {
    return null;
  } finally {
    Error.prepareStackTrace = oldPrepare;
  }
}

/**
 * Automatically wrap async functions with tracing that includes file path
 */
export function traced<T extends (...args: any[]) => Promise<any>>(
  operationName: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const tracer = trace.getTracer('auto-trace');
    const callerInfo = getCallerInfo();

    return tracer.startActiveSpan(operationName, async (span) => {
      try {
        // Add file info automatically
        if (callerInfo) {
          span.setAttribute('code.filepath', callerInfo.filepath);
          span.setAttribute('code.function', callerInfo.functionName);
        }

        const result = await fn(...args);
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // ERROR
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }) as T;
}

/**
 * Decorator for class methods (TypeScript experimental decorators)
 */
export function Traced(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const opName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracer = trace.getTracer('auto-trace');

      return tracer.startActiveSpan(opName, async (span) => {
        try {
          // Get file info from the decorator
          const callerInfo = getCallerInfo();
          if (callerInfo) {
            span.setAttribute('code.filepath', callerInfo.filepath);
            span.setAttribute('code.function', propertyKey);
          }
          span.setAttribute('code.class', target.constructor.name);

          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: 1 });
          return result;
        } catch (error) {
          span.setStatus({ code: 2 });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

/**
 * Simple wrapper that auto-detects file from stack trace
 */
export async function traceAsync<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('auto-trace');
  const callerInfo = getCallerInfo();

  return tracer.startActiveSpan(operationName, async (span) => {
    try {
      if (callerInfo) {
        span.setAttribute('code.filepath', callerInfo.filepath);
        span.setAttribute('code.function', callerInfo.functionName);
      }

      const result = await fn();
      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.setStatus({ code: 2 });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
