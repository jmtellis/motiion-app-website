"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

import "./buyer-ui.css";

export type ToastVariant = "default" | "success" | "error";

export type ToastInput = {
  message: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = ToastInput & { id: number };

type ToastContextValue = {
  showToast: (input: ToastInput | string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") return <CheckCircle2 className="size-4 shrink-0 text-[#2dd4bf]" aria-hidden />;
  if (variant === "error") return <AlertCircle className="size-4 shrink-0 text-rose-400" aria-hidden />;
  return <Info className="size-4 shrink-0 text-white/60" aria-hidden />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const reducedMotion = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput | string) => {
      const payload: ToastInput = typeof input === "string" ? { message: input } : input;
      const id = ++idRef.current;
      const record: ToastRecord = {
        id,
        message: payload.message,
        variant: payload.variant ?? "default",
        duration: payload.duration ?? 2800,
      };

      setToasts((current) => [...current.slice(-2), record]);

      const timer = setTimeout(() => dismiss(id), record.duration);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="buyer-toast-stack" aria-live="polite" aria-relevant="additions">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role="status"
              className={`buyer-toast buyer-toast--${toast.variant}`}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: reducedMotion ? 0.12 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <ToastIcon variant={toast.variant ?? "default"} />
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
