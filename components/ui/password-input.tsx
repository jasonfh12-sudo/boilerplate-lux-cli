"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrengthIndicator?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrengthIndicator = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [strength, setStrength] = React.useState(0);

    const calculateStrength = (password: string): number => {
      if (!password) return 0;

      let score = 0;

      // Length
      if (password.length >= 8) score += 1;
      if (password.length >= 12) score += 1;

      // Contains lowercase
      if (/[a-z]/.test(password)) score += 1;

      // Contains uppercase
      if (/[A-Z]/.test(password)) score += 1;

      // Contains numbers
      if (/\d/.test(password)) score += 1;

      // Contains special characters
      if (/[^A-Za-z0-9]/.test(password)) score += 1;

      return Math.min(score, 4);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (showStrengthIndicator) {
        setStrength(calculateStrength(e.target.value));
      }
      props.onChange?.(e);
    };

    const getStrengthLabel = (strength: number): { text: string; color: string } => {
      switch (strength) {
        case 0:
          return { text: "", color: "" };
        case 1:
          return { text: "Weak", color: "bg-red-500" };
        case 2:
          return { text: "Fair", color: "bg-orange-500" };
        case 3:
          return { text: "Good", color: "bg-yellow-500" };
        case 4:
          return { text: "Strong", color: "bg-green-500" };
        default:
          return { text: "", color: "" };
      }
    };

    const strengthInfo = getStrengthLabel(strength);

    return (
      <div className="relative w-full">
        <input
          type={showPassword ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
          onChange={handlePasswordChange}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>

        {showStrengthIndicator && props.value && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    level <= strength ? strengthInfo.color : "bg-gray-200"
                  )}
                />
              ))}
            </div>
            {strengthInfo.text && (
              <p className="text-xs text-gray-600">
                Password strength: <span className="font-medium">{strengthInfo.text}</span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
