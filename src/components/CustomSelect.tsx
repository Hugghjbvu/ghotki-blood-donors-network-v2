import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface Option {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  label?: string;
  labelClassName?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | Option)[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
}

export default function CustomSelect({
  label,
  labelClassName = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 pl-1",
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formattedOptions: Option[] = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = formattedOptions.find((opt) => opt.value === value);

  // Calculate position and placement (upwards if space below is constrained)
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const estimatedHeight = Math.min(220, Math.max(90, formattedOptions.length * 38 + 12));
    const shouldOpenUpwards = spaceBelow < Math.min(estimatedHeight, 180) && spaceAbove > spaceBelow;

    if (shouldOpenUpwards) {
      setPlacement("top");
      const availableHeight = Math.min(220, Math.max(100, spaceAbove - 16));
      setCoords({
        bottom: viewportHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: availableHeight,
      });
    } else {
      setPlacement("bottom");
      const availableHeight = Math.min(220, Math.max(100, spaceBelow - 16));
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: availableHeight,
      });
    }
  }, [formattedOptions.length]);

  // Manage open/close mounting with smooth ease-out enter and ease-in exit
  useEffect(() => {
    const isReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isOpen) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      updateDropdownPosition();
      setIsMounted(true);
      if (isReduced) {
        setIsVisible(true);
      } else {
        const frame = requestAnimationFrame(() => {
          updateDropdownPosition();
          setIsVisible(true);
        });
        return () => cancelAnimationFrame(frame);
      }
    } else {
      setIsVisible(false);
      if (isReduced) {
        setIsMounted(false);
      } else {
        closeTimeoutRef.current = setTimeout(() => {
          setIsMounted(false);
        }, 160);
      }
    }

    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [isOpen, updateDropdownPosition]);

  // Close when clicking/tapping outside and handle position on resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideInteraction(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        (containerRef.current && containerRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleWindowChange() {
      if (isOpen) {
        updateDropdownPosition();
      }
    }

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("touchstart", handleOutsideInteraction, { passive: true });
    window.addEventListener("resize", handleWindowChange, { passive: true });
    window.addEventListener("scroll", handleWindowChange, { capture: true, passive: true });

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, { capture: true });
    };
  }, [isOpen, updateDropdownPosition]);

  return (
    <div
      className={`relative w-full text-left font-sans ${className}`}
      ref={containerRef}
    >
      {label && (
        <label className={labelClassName}>
          {label}
        </label>
      )}

      {/* Button Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between shadow-sm select-none focus:outline-none btn-press ${
          disabled
            ? "bg-gray-100/90 text-gray-400 cursor-not-allowed opacity-60 border border-gray-200"
            : isOpen
            ? "bg-white border-blood ring-2 ring-blood/30 text-gray-950 cursor-pointer"
            : "bg-white/90 hover:bg-white border-gray-200 text-gray-950 hover:border-gray-300 cursor-pointer"
        } ${
          buttonClassName
            ? buttonClassName
            : "px-4 py-3 border rounded-xl text-sm font-semibold"
        }`}
      >
        <span className={`truncate text-left ${selectedOption?.value ? "text-gray-900 font-semibold" : "text-gray-400 font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 ml-2 dropdown-chevron-anim ${
            isOpen ? "dropdown-open text-blood" : "dropdown-closed text-gray-400"
          }`}
        />
      </button>

      {/* Portal-Rendered Dropdown Content: Attached directly to document.body for ultimate stacking */}
      {isMounted && !disabled && coords && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            ...(placement === "bottom"
              ? { top: `${coords.top}px` }
              : { bottom: `${coords.bottom}px` }),
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 99999,
          }}
          className={`bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto overscroll-contain py-1.5 dropdown-panel-anim dropdown-placement-${placement} ${
            isVisible ? "dropdown-visible" : ""
          } ${dropdownClassName}`}
        >
          {formattedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm font-semibold text-left transition-colors duration-150 btn-press ${
                  isSelected
                    ? "bg-rose-50 text-blood font-bold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="truncate pr-2">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-blood shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
