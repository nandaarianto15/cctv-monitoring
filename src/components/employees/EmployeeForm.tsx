/**
 * Employee create/edit form. Used inline on the Employees page.
 */
import { useState, type FormEvent } from 'react';
import type { Employee } from '../../types';
import { Button, CheckboxInput, Field, TextInput } from '../ui/primitives';

export interface EmployeeDraft {
  name: string;
  role: string;
  notes: string;
  active: boolean;
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
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Field label="Name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Chen" required />
      </Field>
      <Field label="Role (optional)">
        <TextInput value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Support engineer" />
      </Field>
      <Field label="Notes (optional)">
        <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Morning shift" />
      </Field>
      {initial && <CheckboxInput label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />}
      <div className="flex gap-2">
        <Button variant="primary" type="submit" disabled={name.trim() === ''}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {initial && !active && (
        <p className="text-xs text-zinc-500">
          Inactive employees stay in the records but no longer appear in assignment dropdowns.
        </p>
      )}
    </form>
  );
}
