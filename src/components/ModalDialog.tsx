import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { acquireScrollLock } from "../utils/scrollLock";

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMountChange?: (isMounted: boolean) => void;
  onClosedComplete?: () => void;
  backdropClassName?: string;
  panelClassName?: string;
  zIndex?: string;
  children?: React.ReactNode;
}

export default function ModalDialog({
  isOpen,
  onClose,
  onMountChange,
  onClosedComplete,
  backdropClassName = "bg-gray-950/40 backdrop-blur-md",
  panelClassName = "",
  zIndex = "z-[999]",
  children
}: ModalDialogProps) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [renderedContent, setRenderedContent] = useState<React.ReactNode>(children);
  
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMountChangeRef = useRef(onMountChange);
  onMountChangeRef.current = onMountChange;
  const onClosedCompleteRef = useRef(onClosedComplete);
  onClosedCompleteRef.current = onClosedComplete;

  // Preserve and update content while open
  useEffect(() => {
    if (children) {
      setRenderedContent(children);
    }
  }, [children]);

  // Body scroll lock management with reference counting:
  // Acquires lock when isOpen is true, and guarantees release when isOpen becomes false
  // (including programmatic closing after delete, reset password, remove admin, etc.)
  // OR when the modal component unmounts.
  useEffect(() => {
    if (!isOpen) return;

    const release = acquireScrollLock();

    return () => {
      release();
    };
  }, [isOpen]);

  // Ensure unmount safety: if the modal component unmounts while mounted or while closing timer is active
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      onMountChangeRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const isReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isOpen) {
      setIsMounted(true);
      setIsClosing(false);
      onMountChangeRef.current?.(true);
    } else {
      if (!isMounted) return;

      if (isReduced) {
        setIsMounted(false);
        setIsClosing(false);
        onMountChangeRef.current?.(false);
        onClosedCompleteRef.current?.();
      } else {
        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
          setIsMounted(false);
          setIsClosing(false);
          onMountChangeRef.current?.(false);
          onClosedCompleteRef.current?.();
        }, 180);
      }
    }

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [isOpen, isMounted]);

  if (!isMounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className={`fixed inset-0 w-full h-[100dvh] min-h-[100dvh] ${zIndex} flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain`}>
      <div
        className={`fixed inset-0 w-full h-[100dvh] pointer-events-auto modal-overlay ${
          isClosing ? "modal-overlay-exit" : "modal-overlay-enter"
        } ${backdropClassName}`}
        onClick={onClose}
      />
      <div
        className={`relative z-10 my-auto max-h-[calc(100dvh-2rem)] flex flex-col modal-panel ${
          isClosing ? "modal-panel-exit" : "modal-panel-enter"
        } ${panelClassName}`}
      >
        {renderedContent}
      </div>
    </div>,
    document.body
  );
}
