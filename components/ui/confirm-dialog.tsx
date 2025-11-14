"use client";

import * as React from "react";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: "default" | "destructive" | "warning";
  loading?: boolean;
  confirmDisabled?: boolean;
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
  confirmDisabled = false,
}: ConfirmDialogProps) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling should be done by the parent component
      console.error("Confirm action failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const variantConfig = {
    default: {
      icon: <Info className="h-6 w-6 text-blue-600" />,
      iconBg: "bg-blue-100",
      buttonVariant: "default" as const,
    },
    warning: {
      icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
      iconBg: "bg-yellow-100",
      buttonVariant: "default" as const,
    },
    destructive: {
      icon: <AlertCircle className="h-6 w-6 text-red-600" />,
      iconBg: "bg-red-100",
      buttonVariant: "destructive" as const,
    },
  };

  const config = variantConfig[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                config.iconBg
              )}
            >
              {config.icon}
            </div>
            <div className="flex-1 pt-1">
              <DialogTitle className="text-left">{title}</DialogTitle>
              <DialogDescription className="text-left mt-2">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading || loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={isLoading || loading || confirmDisabled}
          >
            {isLoading || loading ? "Loading..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ConfirmDialog.displayName = "ConfirmDialog";

export { ConfirmDialog };

// Hook for easier usage
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string | React.ReactNode;
    variant: "default" | "destructive" | "warning";
    confirmText: string;
    cancelText: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    variant: "default",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: () => {},
  });

  const confirm = React.useCallback(
    (config: {
      title: string;
      description: string | React.ReactNode;
      variant?: "default" | "destructive" | "warning";
      confirmText?: string;
      cancelText?: string;
      onConfirm: () => void | Promise<void>;
      onCancel?: () => void;
    }) => {
      setState({
        open: true,
        title: config.title,
        description: config.description,
        variant: config.variant || "default",
        confirmText: config.confirmText || "Confirm",
        cancelText: config.cancelText || "Cancel",
        onConfirm: config.onConfirm,
        onCancel: config.onCancel,
      });
    },
    []
  );

  const closeDialog = React.useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    confirm,
    dialogProps: {
      ...state,
      onOpenChange: closeDialog,
    },
  };
}
