import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ToastMessage } from "../types";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !toasts || toasts.length === 0) return null;

  return createPortal(
    <div 
      id="toast-portal-container"
      style={{ position: "fixed", top: "80px", zIndex: 999999 }}
      className="fixed top-[80px] left-4 sm:left-6 z-[999999] flex flex-col items-start gap-2.5 max-w-[calc(100vw-32px)] sm:max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void; key?: string }) {
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    const isReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) {
      onDismiss(toast.id);
      return;
    }
    setIsExiting(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, 180);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 3000); // 3 seconds visible

    return () => {
      clearTimeout(timer);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [handleDismiss]);

  const config = {
    success: {
      border: "border-emerald-200 bg-white/95 text-emerald-950 shadow-emerald-500/10",
      accent: "bg-emerald-500",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    },
    error: {
      border: "border-rose-200 bg-white/95 text-rose-950 shadow-rose-500/10",
      accent: "bg-blood",
      icon: <AlertCircle className="w-4 h-4 text-blood shrink-0" />,
    },
    info: {
      border: "border-amber-200 bg-white/95 text-amber-950 shadow-amber-500/10",
      accent: "bg-amber-500",
      icon: <Info className="w-4 h-4 text-amber-600 shrink-0" />,
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 px-3 py-2 border shadow-lg rounded-xl max-w-full overflow-hidden ${
        isExiting ? "toast-exit" : "toast-enter"
      } ${config.border}`}
      role="alert"
    >
      {config.icon}
      <span className="text-xs sm:text-[13px] font-bold tracking-tight text-gray-900 leading-tight max-w-[calc(100vw-80px)] sm:max-w-md">
        {toast.message}
      </span>
      <button
        onClick={handleDismiss}
        className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-0.5 rounded-md hover:bg-gray-100/80 ml-0.5"
        aria-label="Dismiss toast"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

