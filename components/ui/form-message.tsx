"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "success" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const FormMessage = React.forwardRef<HTMLDivElement, FormMessageProps>(
  (
    {
      className,
      variant = "info",
      title,
      children,
      dismissible = false,
      onDismiss,
      ...props
    },
    ref
  ) => {
    const [isDismissed, setIsDismissed] = React.useState(false);

    const handleDismiss = () => {
      setIsDismissed(true);
      onDismiss?.();
    };

    if (isDismissed) return null;

    const variantStyles = {
      error: {
        container: "bg-red-50 border-red-200 text-red-800",
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        titleColor: "text-red-800",
      },
      success: {
        container: "bg-green-50 border-green-200 text-green-800",
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        titleColor: "text-green-800",
      },
      warning: {
        container: "bg-yellow-50 border-yellow-200 text-yellow-800",
        icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
        titleColor: "text-yellow-800",
      },
      info: {
        container: "bg-blue-50 border-blue-200 text-blue-800",
        icon: <Info className="h-5 w-5 text-blue-600" />,
        titleColor: "text-blue-800",
      },
    };

    const styles = variantStyles[variant];

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-lg border p-4",
          styles.container,
          className
        )}
        {...props}
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0">{styles.icon}</div>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className={cn("text-sm font-semibold mb-1", styles.titleColor)}>
                {title}
              </h3>
            )}
            <div className="text-sm">{children}</div>
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 ml-2 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-gray-500 rounded"
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

FormMessage.displayName = "FormMessage";

// Convenience components
const FormError = React.forwardRef<
  HTMLDivElement,
  Omit<FormMessageProps, "variant">
>((props, ref) => <FormMessage ref={ref} variant="error" {...props} />);
FormError.displayName = "FormError";

const FormSuccess = React.forwardRef<
  HTMLDivElement,
  Omit<FormMessageProps, "variant">
>((props, ref) => <FormMessage ref={ref} variant="success" {...props} />);
FormSuccess.displayName = "FormSuccess";

const FormWarning = React.forwardRef<
  HTMLDivElement,
  Omit<FormMessageProps, "variant">
>((props, ref) => <FormMessage ref={ref} variant="warning" {...props} />);
FormWarning.displayName = "FormWarning";

const FormInfo = React.forwardRef<
  HTMLDivElement,
  Omit<FormMessageProps, "variant">
>((props, ref) => <FormMessage ref={ref} variant="info" {...props} />);
FormInfo.displayName = "FormInfo";

export { FormMessage, FormError, FormSuccess, FormWarning, FormInfo };
