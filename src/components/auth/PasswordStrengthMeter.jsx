import { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { evaluatePasswordStrength } from '../../utils/authValidation.js';

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Enter password',
  autoComplete = 'current-password',
  required = false,
  error = '',
  showStrength = false,
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? evaluatePasswordStrength(value) : null;

  const barColors = {
    empty: 'bg-[#E3EBE5]',
    weak: 'bg-red-500',
    fair: 'bg-amber-500',
    good: 'bg-[#22A06B]',
    strong: 'bg-[#16834A]',
  };

  const labelColors = {
    empty: 'text-[#64756B]',
    weak: 'text-red-600',
    fair: 'text-amber-700',
    good: 'text-[#116438]',
    strong: 'text-[#16834A]',
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-[#17231C]">
          {label}
          {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full pl-3.5 pr-11 py-2.5 text-sm rounded-lg border bg-white text-[#17231C] placeholder:text-[#64756B]/70 focus:outline-none transition-colors ${
            error
              ? 'border-red-400 focus:border-red-600'
              : 'border-[#E3EBE5] focus:border-[#16834A]'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label || 'password'}` : `Show ${label || 'password'}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#64756B] hover:text-[#17231C] hover:bg-[#F7FAF7] transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}

      {showStrength && strength && String(value || '').length > 0 && (
        <div className="pt-1 space-y-2">
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-sm transition-colors ${
                  strength.score >= step ? barColors[strength.tone] : 'bg-[#E3EBE5]'
                }`}
              />
            ))}
          </div>
          <p className={`text-xs font-medium ${labelColors[strength.tone]}`}>
            Password strength: {strength.label}
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#64756B]">
            {[
              { ok: strength.checks.minLength, text: '8+ characters' },
              { ok: strength.checks.hasLower && strength.checks.hasUpper, text: 'Upper & lowercase' },
              { ok: strength.checks.hasNumber, text: 'At least 1 number' },
              { ok: strength.checks.hasSymbol, text: 'Special symbol' },
            ].map((rule) => (
              <li key={rule.text} className="inline-flex items-center gap-1.5">
                {rule.ok ? (
                  <Check className="w-3.5 h-3.5 text-[#16834A] shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-[#64756B]/60 shrink-0" />
                )}
                <span className={rule.ok ? 'text-[#17231C]' : 'text-[#64756B]'}>
                  {rule.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
