"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check, X } from "lucide-react";

type PasswordInputWithStrengthProps = {
  id?: string;
  name?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showStrengthMeter?: boolean;
  required?: boolean;
  className?: string;
};

export function calculatePasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "bg-slate-200", percent: 0 };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: 1, label: "Weak", color: "bg-red-500", percent: 25 };
  } else if (score === 2) {
    return { score: 2, label: "Medium", color: "bg-amber-500", percent: 50 };
  } else if (score === 3) {
    return { score: 3, label: "Strong", color: "bg-emerald-500", percent: 75 };
  } else {
    return { score: 4, label: "Excellent", color: "bg-indigo-600", percent: 100 };
  }
}

export function PasswordInputWithStrength({
  id = "password",
  name = "password",
  placeholder = "Enter password",
  value,
  onChange,
  showStrengthMeter = true,
  required = false,
  className = "",
}: PasswordInputWithStrengthProps) {
  const [showPassword, setShowPassword] = useState(false);

  const strength = useMemo(() => calculatePasswordStrength(value), [value]);

  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumberOrSpecial = /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`pr-11 ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrengthMeter && value.length > 0 && (
        <div className="space-y-1.5 pt-1 animate-fade-in-up">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium text-[11px]">Password Strength:</span>
            <span className={`font-bold text-[11px] ${
              strength.score === 1 ? "text-red-500" :
              strength.score === 2 ? "text-amber-500" :
              strength.score === 3 ? "text-emerald-500" : "text-indigo-600 dark:text-indigo-400"
            }`}>
              {strength.label}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${strength.color}`}
              style={{ width: `${strength.percent}%` }}
            />
          </div>

          {/* Requirements checklist */}
          <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
            <div className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
              {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>8+ characters</span>
            </div>
            <div className={`flex items-center gap-1 ${hasUppercase ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
              {hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Uppercase letter</span>
            </div>
            <div className={`flex items-center gap-1 ${hasLowercase ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
              {hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Lowercase letter</span>
            </div>
            <div className={`flex items-center gap-1 ${hasNumberOrSpecial ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
              {hasNumberOrSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>Number / Symbol</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
