'use client';

import * as React from 'react';
import { componentLogger, LogContext } from '@/lib/logging/component-logger';

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  duration?: number;
  variant?: 'default' | 'destructive';
};

const TOAST_LIMIT = 5;

let count = 0;

function genId() {
  count = (count + 1) % 100;
  return count.toString();
}

type ToastState = {
  toasts: ToasterToast[];
};

const toastState: ToastState = {
  toasts: [],
};

const listeners: Array<(state: ToastState) => void> = [];

export function useToast() {
  const [state, setState] = React.useState<ToastState>(toastState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  const toast = React.useCallback(
    ({ ...props }: Omit<ToasterToast, 'id'>) => {
      const id = genId();

      const newToast: ToasterToast = {
        id,
        ...props,
      };

      componentLogger.log(LogContext.HOOK, 'Toast invoked', { title: newToast.title });

      toastState.toasts = [newToast, ...toastState.toasts].slice(0, TOAST_LIMIT);
      
      listeners.forEach((listener) => {
        listener(toastState);
      });

      return {
        id: id,
        dismiss: () => dismiss(id),
        update: (props: Partial<ToasterToast>) => update(id, props),
      };
    },
    []
  );
  
  const dismiss = (toastId?: string) => {
    toastState.toasts = toastState.toasts.filter((t) => t.id !== toastId);
    listeners.forEach((listener) => {
        listener(toastState);
    });
  };

  const update = (toastId: string, props: Partial<ToasterToast>) => {
    toastState.toasts = toastState.toasts.map((t) =>
      t.id === toastId ? { ...t, ...props } : t
    );
     listeners.forEach((listener) => {
        listener(toastState);
    });
  };


  return {
    ...state,
    toast,
    dismiss,
  };
}
