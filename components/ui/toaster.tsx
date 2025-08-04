// components/ui/toaster.tsx
"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useComponentLifecycleLogger, componentLogger, LogContext } from "@/lib/logging/component-logger";

/**
 * Renders toasts that are dispatched via the useToast hook.
 * It listens for new toasts and displays them in the viewport.
 */
export function Toaster() {
  useComponentLifecycleLogger('Toaster');
  const { toasts } = useToast();

  componentLogger.log(LogContext.UI, 'Toaster rendering', { toastCount: toasts.length });

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
