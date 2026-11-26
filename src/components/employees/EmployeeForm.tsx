/**
 * Employee create/edit form. Used inline on the Employees page.
 * Vyra dark treatment (self-contained): dark fields, inputs, buttons in-file.
 */
import { useState } from 'react';
import type { FormEvent, ChangeEvent, ReactNode } from 'react';
import type { Employee } from '../../types';

export interface EmployeeDraft {
  name: string;
  role: string;
  notes: string;
  active: boolean;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[12px] font-medium text-[#E8ECF4] placeholder:text-[#5A6474] outline-none transition-colors hover:border-white/[0.16] focus:border-[#7AA2F7]/40 focus:bg-[#7AA2F7]/[0.05]';

/** Dark field wrapper — uppercase micro-label. */
function DarkField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6474]">
        {label}
      </span>
      {children}
    </div>
  );
}

function DarkTextInput({
  value,
  onChange,
  placeholder,
  required = false,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className={INPUT_CLASS}
    />
  );
}

/** Native checkbox restyled with accent color — crisp on dark backgrounds. */
function DarkCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="inline-flex w-fit cursor-pointer select-none items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded accent-[#7AA2F7]"
      />
      <span className="text-[12px] font-medium text-[#E8ECF4]">{label}</span>
    </label>
  );
}

/** Dark button — gradient primary / ghost. */
function DarkButton({
  variant = 'primary',
  type = 'button',
  disabled = false,
  onClick,
  children,
}: {
  variant?: 'primary' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const variants = {
    primary:
      'bg-gradient-to-r from-[#5D87E8] to-[#7AA2F7] text-white shadow-[0_10px_28px_-10px_rgba(122,162,247,0.65)] hover:brightness-110',
    ghost:
      'border border-white/[0.08] bg-white/[0.02] text-[#E8ECF4] hover:border-white/[0.16] hover:bg-white/[0.05]',
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

export function EmployeeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Employee;
  submitLabel: string;
  onSubmit: (draft: EmployeeDraft) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [active, setActive] = useState(initial?.active ?? true);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (name.trim() === '') return;
    onSubmit({ name: name.trim(), role: role.trim(), notes: notes.trim(), active });
    if (!initial) {
      setName('');
      setRole('');
      setNotes('');
      setActive(true);
    }
  };

  return (
    <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
      <DarkField label="Name">
        <DarkTextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex Chen"
          required
        />
      </DarkField>
      <DarkField label="Role (optional)">
        <DarkTextInput
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Support engineer"
        />
      </DarkField>
      <DarkField label="Notes (optional)">
        <DarkTextInput
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Morning shift"
        />
      </DarkField>
      {initial && (
        <DarkCheckbox label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />
      )}
      <div className="flex gap-2 pt-0.5">
        <DarkButton variant="primary" type="submit" disabled={name.trim() === ''}>
          {submitLabel}
        </DarkButton>
        {onCancel && (
          <DarkButton variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </DarkButton>
        )}
      </div>
      {initial && !active && (
        <p className="text-[11px] leading-relaxed text-[#5A6474]">
          Inactive employees stay in the records but no longer appear in assignment dropdowns.
        </p>
      )}
    </form>
  );
}