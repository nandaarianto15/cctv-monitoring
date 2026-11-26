/**
 * Vyra - Employee Directory Page.
 * Premium dark theme applied in-place (self-contained - no shared kit needed):
 * - Full-bleed aurora canvas + blueprint grid, identical to Live Monitoring.
 * - Overline header with workforce meta (pulse dot) + gradient CTA.
 * - Dark panels, dark data table, dark badges/inputs, two-step delete confirm.
 * - Staggered vyra-rise entrance.
 */
import { useState, useMemo } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
import type { Id } from '../types';
import { useVision } from '../state/VisionContext';
import { useAssignments, useCameras, useEmployees } from '../hooks/useVision';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import { shortTrackId } from '../utils/format';
import { Users, Plus, UserCheck, Edit3 } from '../components/icons';
import type { PageId } from '../components/navigation/Sidebar';

/* ---------------- Local primitives (Vyra recipes, kept in-file) ---------------- */

const INPUT_CLASS =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[12px] font-medium text-[#E8ECF4] placeholder:text-[#5A6474] outline-none transition-colors hover:border-white/[0.16] focus:border-[#7AA2F7]/40 focus:bg-[#7AA2F7]/[0.05]';

/** Dark panel - Card replacement: soft header strip + padded body (or flush for tables). */
function DarkPanel({
  title,
  subtitle,
  actions,
  flush = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.015] px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-[#E8ECF4]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-[#5A6474]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {flush ? children : <div className="p-4 md:p-5">{children}</div>}
    </section>
  );
}

/** Dark button - gradient primary, ghost secondary, danger for destructive. */
function DarkButton({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  icon,
  onClick,
  children,
}: {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-[11.5px]',
    md: 'px-3.5 py-2 text-[12px]',
  } as const;
  const variants = {
    primary:
      'bg-gradient-to-r from-[#5D87E8] to-[#7AA2F7] text-white shadow-[0_10px_28px_-10px_rgba(122,162,247,0.65)] hover:brightness-110',
    ghost:
      'border border-white/[0.08] bg-white/[0.02] text-[#E8ECF4] hover:border-white/[0.16] hover:bg-white/[0.05]',
    danger:
      'border border-rose-500/30 bg-rose-500/[0.08] text-rose-300 hover:bg-rose-500/[0.16]',
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${variants[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Two-step destructive action (dark). Auto-resets after 4s. */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <DarkButton
      variant={confirming ? 'danger' : 'ghost'}
      size="sm"
      onClick={() => {
        if (confirming) {
          onConfirm();
          setConfirming(false);
        } else {
          setConfirming(true);
          window.setTimeout(() => setConfirming(false), 4000);
        }
      }}
    >
      {confirming ? confirmLabel : label}
    </DarkButton>
  );
}

/** Dark pill badge - zinc (neutral) or green (live). */
function DarkBadge({
  tone = 'zinc',
  dot = false,
  children,
}: {
  tone?: 'zinc' | 'green';
  dot?: boolean;
  children: ReactNode;
}) {
  const tones = {
    zinc: 'border-white/[0.08] bg-white/[0.03] text-[#96A0B0]',
    green: 'border-[#4ADE80]/25 bg-[#4ADE80]/[0.08] text-[#4ADE80]',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tones[tone]}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${tone === 'green' ? 'animate-pulse bg-[#4ADE80]' : 'bg-[#5A6474]'}`} />
      )}
      {children}
    </span>
  );
}

/** Dark search input with inline magnifier glyph - no icon-set dependency. */
function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-60">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6474]"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );
}

/** Dark-themed empty state - no gray boxes, stays on the dark canvas. */
function EmptyBlock({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-[#5A6474]">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-[#96A0B0]">{title}</p>
      <p className="max-w-xs text-[11.5px] leading-relaxed text-[#5A6474]">{hint}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function EmployeesPage({ navigate: _navigate }: { navigate?: (page: PageId) => void }): JSX.Element {
  const { controller } = useVision();
  const employees = useEmployees();
  const cameras = useCameras();
  const assignments = useAssignments();

  const [editingId, setEditingId] = useState<Id | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cameraLabel = (cameraId: string): string =>
    cameras.find((c) => c.id === cameraId)?.label ?? 'Unknown Camera';
  const employeeName = (employeeId: string): string =>
    employees.find((e) => e.id === employeeId)?.name ?? shortTrackId(employeeId);

  const activeCount = employees.filter((e) => e.active).length;

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  return (
    <div className="relative min-h-full bg-gradient-to-b from-[#0D1119] via-[#0A0D13] to-[#090C11] text-[#96A0B0]">
      <style>{`
        @keyframes vyraRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .vyra-rise { animation: vyraRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .vyra-rise { animation: none; } }
      `}</style>

      {/* Ambient depth: aurora glow + faint blueprint grid, fading downward - identical to Live Monitoring */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_45%_at_50%_-12%,rgba(122,162,247,0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)] [background-image:linear-gradient(rgba(148,163,198,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,198,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative flex flex-col gap-6 p-5 md:p-7 lg:p-8">
        {/* Header - overline, title, workforce meta, gradient CTA */}
        <header className="vyra-rise flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A6474]">
              Workforce Registry
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#E8ECF4] md:text-[30px]">
              Employee Directory
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#67717F]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeCount > 0 ? 'animate-pulse bg-[#4ADE80]' : 'bg-[#5A6474]'
                  }`}
                />
                {activeCount > 0
                  ? `${activeCount} of ${employees.length} employees active`
                  : `${employees.length} records idle`}
              </span>
              <span className="text-[#3A424E]">·</span>
              <span>
                {assignments.length} live track assignment{assignments.length === 1 ? '' : 's'}
              </span>
            </p>
          </div>

          {!isAdding && (
            <DarkButton variant="primary" icon={<Plus size={14} />} onClick={() => setIsAdding(true)}>
              Add Employee
            </DarkButton>
          )}
        </header>

        {/* Register New Employee */}
        {isAdding && (
          <div className="vyra-rise" style={{ animationDelay: '60ms' }}>
            <DarkPanel
              title="Register New Employee"
              subtitle="Add manual staff records for track assignments"
              actions={
                <DarkButton variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                  Cancel
                </DarkButton>
              }
            >
              <EmployeeForm
                submitLabel="Register Employee"
                onCancel={() => setIsAdding(false)}
                onSubmit={(draft) => {
                  controller.addEmployee(draft);
                  setIsAdding(false);
                }}
              />
            </DarkPanel>
          </div>
        )}

        {/* Active Live Assignments Overview */}
        {assignments.length > 0 && (
          <div className="vyra-rise" style={{ animationDelay: '120ms' }}>
            <DarkPanel
              title={`Active Track Assignments (${assignments.length})`}
              subtitle="Temporary track bindings manually confirmed by operators"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.trackId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#4ADE80]/25 bg-[#4ADE80]/[0.08] text-[#4ADE80]">
                        <UserCheck size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-[#E8ECF4]">
                          {employeeName(assignment.employeeId)}
                        </p>
                        <p className="truncate text-[11px] text-[#5A6474]">
                          {cameraLabel(assignment.cameraId)} · #{shortTrackId(assignment.trackId)}
                        </p>
                      </div>
                    </div>
                    <DarkButton
                      variant="ghost"
                      size="sm"
                      onClick={() => controller.unassignTrack(assignment.trackId)}
                    >
                      Unbind
                    </DarkButton>
                  </div>
                ))}
              </div>
            </DarkPanel>
          </div>
        )}

        {/* Employee Data Table */}
        <div className="vyra-rise" style={{ animationDelay: '180ms' }}>
          <DarkPanel
            title={`All Registered Employees (${employees.length})`}
            subtitle="Employee database stored in local repository abstraction"
            flush
            actions={
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or role…"
              />
            }
          >
            {filteredEmployees.length === 0 ? (
              <EmptyBlock
                icon={<Users size={18} />}
                title={searchQuery ? 'No matching employees' : 'No employees registered'}
                hint="Add staff members to enable manual assignment during live detection."
                action={
                  !isAdding && (
                    <DarkButton variant="primary" size="sm" onClick={() => setIsAdding(true)}>
                      Add Employee
                    </DarkButton>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015] text-[10px] uppercase tracking-[0.12em] text-[#5A6474]">
                      <th className="px-5 py-3 font-semibold">Employee Name</th>
                      <th className="px-5 py-3 font-semibold">Role / Department</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Internal Notes</th>
                      <th className="px-5 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {filteredEmployees.map((employee) =>
                      editingId === employee.id ? (
                        <tr key={employee.id}>
                          <td colSpan={5} className="bg-white/[0.015] p-4 md:px-5 md:py-4">
                            {/* Edit mode - blue-tinted inset to signal active editing */}
                            <div className="rounded-xl border border-[#7AA2F7]/25 bg-[#7AA2F7]/[0.04] p-4">
                              <EmployeeForm
                                initial={employee}
                                submitLabel="Save Changes"
                                onCancel={() => setEditingId(null)}
                                onSubmit={(draft) => {
                                  controller.saveEmployee({ ...employee, ...draft });
                                  setEditingId(null);
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={employee.id} className="transition-colors hover:bg-white/[0.02]">
                          <td className="px-5 py-3.5 text-[12px] font-semibold text-[#E8ECF4]">
                            {employee.name}
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-[#96A0B0]">
                            {employee.role || '-'}
                          </td>
                          <td className="px-5 py-3.5">
                            {employee.active ? (
                              <DarkBadge tone="green" dot>
                                Active
                              </DarkBadge>
                            ) : (
                              <DarkBadge tone="zinc">Inactive</DarkBadge>
                            )}
                          </td>
                          <td className="max-w-xs truncate px-5 py-3.5 text-[12px] text-[#67717F]">
                            {employee.notes || '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <DarkButton
                                variant="ghost"
                                size="sm"
                                icon={<Edit3 size={13} />}
                                onClick={() => setEditingId(employee.id)}
                              >
                                Edit
                              </DarkButton>
                              <ConfirmButton
                                label="Delete"
                                confirmLabel="Delete?"
                                onConfirm={() => {
                                  controller.deleteEmployee(employee.id);
                                  setEditingId((id) => (id === employee.id ? null : id));
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}