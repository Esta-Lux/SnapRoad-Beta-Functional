/**
 * useToast Hook
 * Unified toast notifications for admin portal
 */

import toast from 'react-hot-toast';

interface ToastOptions {
  duration?: number;
}

export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration || 3000,
      style: {
        background: '#10B981',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px',
      },
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration || 4000,
      style: {
        background: '#EF4444',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px',
      },
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration || 3000,
      style: {
        background: '#3B82F6',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px',
      },
    });
  };

  const loading = (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#1E293B',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px',
      },
    });
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      style: {
        background: '#1E293B',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px',
      },
    });
  };

  return {
    success,
    error,
    info,
    loading,
    dismiss,
    promise,
  };
}

export default useToast;
