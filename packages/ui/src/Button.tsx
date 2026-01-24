/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import React, { ButtonHTMLAttributes } from "react";
import { cn } from "@aksara/core";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "accent" | "outline" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const variantStyles = {
  default: "bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-md",
  secondary: "bg-gradient-to-r from-blue-400 to-blue-500 text-white hover:from-blue-500 hover:to-blue-600 shadow-md",
  accent: "bg-gradient-to-r from-primary-800 to-primary-900 text-white hover:from-primary-900 hover:to-primary-950 shadow-lg",
  outline: "border-2 border-primary-600 bg-white text-primary-700 hover:bg-primary-50 hover:border-primary-700",
  ghost: "hover:bg-primary-50 hover:text-primary-700 text-gray-700",
  link: "text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline",
  destructive: "bg-red-500 text-white hover:bg-red-600 shadow-md",
};

const sizeStyles = {
  default: "h-10 py-2 px-4",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-8",
  icon: "h-10 w-10",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
}


