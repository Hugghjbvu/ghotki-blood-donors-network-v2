import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FloatingLabelInputProps {
  label: string;
  id: string;
  type?: string;
  error?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  title?: string;
  placeholder?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

export default function FloatingLabelInput({
  label,
  id,
  type = "text",
  error,
  value,
  onChange,
  className = "",
  onFocus,
  onBlur,
  ...props
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Determine if label should be in the floated (top-shrinked) state
  const isFloated = isFocused || (value !== undefined && value !== null && value.toString() !== "");

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const isPasswordType = type === "password";
  const currentInputType = isPasswordType ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full mb-4 font-sans">
      <div className="relative font-sans">
        <input
          {...props}
          id={id}
          type={currentInputType}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="" // required so browser defaults do not conflict
          className={`peer w-full px-4 py-3 bg-white rounded-xl text-gray-900 caret-blood font-sans text-sm focus:outline-none focus:ring-2 border transition-all duration-300 ${
            error
              ? "border-rose-300 focus:ring-rose-400 focus:border-rose-400"
              : "border-gray-200 focus:ring-blood/40 focus:border-blood/50"
          } ${isPasswordType ? "pr-12" : ""} ${className}`}
        />
        
        {/* Animated label */}
        <label
          htmlFor={id}
          className={`absolute left-3.5 px-1.5 font-sans transition-all duration-300 pointer-events-none rounded origin-left ${
            isFloated
              ? "top-0 -translate-y-2.5 text-[10px] font-bold tracking-wider text-blood uppercase bg-white"
              : "top-1/2 -translate-y-1/2 text-sm text-gray-500"
          }`}
        >
          {label}
        </label>

        {/* Password toggle visibility button */}
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blood transition-colors focus:outline-none p-1 rounded-lg"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Floating Animated Error text */}
      {error && (
        <p className="mt-1.5 text-xs text-blood font-semibold tracking-wide pl-2 font-sans">
          {error}
        </p>
      )}
    </div>
  );
}

