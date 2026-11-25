/**
 * Premium Enterprise SaaS UI Design System Primitives.
 * Design: Linear / Raycast inspired enterprise aesthetic.
 * Refined light theme (#F7F8FA background, subtle borders, elegant typography).
 */
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { AlertCircle } from '../icons';

// --- Card ---------------------------------------------------------------------

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  noPadding = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={`rounded-xl border border-saas-border bg-white shadow-subtle ${className}`}>
      {(title !== undefined || actions || subtitle) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-saas-border px-5 py-4">
          <div>
            {typeof title === 'string' ? (
              <h2 className="text-sm font-semibold tracking-tight text-saas-primary">{title}</h2>
            ) : (
              title
            )}
            {subtitle && <p className="mt-0.5 text-xs text-saas-secondary">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

// --- Button ---------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-saas-accent hover:bg-saas-accent-hover text-white shadow-sm border border-transparent font-medium',
  secondary:
    'bg-white hover:bg-saas-bg text-saas-primary border border-saas-border shadow-subtle hover:border-gray-300 font-medium',
  danger:
    'bg-saas-error hover:opacity-90 text-white shadow-sm border border-transparent font-medium',
  ghost:
    'bg-transparent hover:bg-gray-100 text-saas-secondary hover:text-saas-primary font-medium',
  outline:
    'bg-transparent hover:bg-saas-bg text-saas-primary border border-saas-border font-medium',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-3.5 py-2 text-sm rounded-lg gap-2',
  lg: 'px-4 py-2.5 text-base rounded-xl gap-2.5',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  icon,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-saas-accent/20 ${BUTTON_SIZES[size]} ${BUTTON_STYLES[variant]} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

const CONFIRM_RESET_MS = 3000;

/** Destructive button with a graceful two-step confirmation. */
export function ConfirmButton({
  label,
  confirmLabel = 'Confirm delete?',
  onConfirm,
  variant = 'danger',
  size = 'sm',
  icon,
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_RESET_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      size={size}
      variant={armed ? 'danger' : variant}
      icon={icon}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}

// --- Badge ------------------------------------------------------------------------

export type BadgeTone = 'zinc' | 'green' | 'amber' | 'rose' | 'blue';

const TONE_CLASSES: Record<BadgeTone, string> = {
  zinc: 'border-saas-border bg-gray-100 text-saas-secondary',
  green: 'border-[#bbf0da] bg-saas-success-light text-saas-success',
  amber: 'border-[#fae3be] bg-saas-warning-light text-saas-warning',
  rose: 'border-[#f8c8c8] bg-saas-error-light text-saas-error',
  blue: 'border-[#d0e0f3] bg-saas-accent-light text-saas-accent',
};

export function Badge({
  tone = 'zinc',
  children,
  dot = false,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tracking-tight ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            tone === 'green'
              ? 'bg-saas-success'
              : tone === 'amber'
              ? 'bg-saas-warning'
              : tone === 'rose'
              ? 'bg-saas-error'
              : tone === 'blue'
              ? 'bg-saas-accent'
              : 'bg-gray-400'
          }`}
        />
      )}
      {children}
    </span>
  );
}

const STATE_TONES: Record<string, BadgeTone> = {
  IN_ZONE: 'green',
  OUT_ZONE: 'zinc',
  SITTING: 'blue',
  STANDING: 'amber',
  UNKNOWN: 'zinc',
  WORKING: 'green',
  NOT_WORKING: 'rose',
  OCCUPIED: 'green',
  UNOCCUPIED: 'zinc',
  TENTATIVE: 'amber',
  CONFIRMED: 'green',
  LOST: 'zinc',
};

/** Badge for domain states with status indicator dot. */
export function StateBadge({ state }: { state: string }) {
  return (
    <Badge tone={STATE_TONES[state] ?? 'zinc'} dot>
      {state}
    </Badge>
  );
}

// --- Empty & Error States -------------------------------------------------------------

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-saas-border bg-white/60 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-1 text-saas-secondary/70">{icon}</div>
      ) : (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-saas-bg text-saas-secondary">
          <AlertCircle size={20} />
        </div>
      )}
      <p className="text-sm font-semibold text-saas-primary">{title}</p>
      {hint && <p className="max-w-md text-xs leading-relaxed text-saas-secondary">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-saas-error/20 bg-saas-error-light px-5 py-6 text-center">
      <p className="text-sm font-semibold text-saas-error">{title}</p>
      {hint && <p className="max-w-md text-xs leading-relaxed text-saas-error/80">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-8 text-xs font-medium text-saas-secondary">
      <span className="h-2 w-2 animate-ping rounded-full bg-saas-accent" />
      <span>{label}</span>
    </div>
  );
}

// --- Form Controls ----------------------------------------------------------------------

export const inputClass =
  'w-full rounded-lg border border-saas-border bg-white px-3 py-2 text-sm text-saas-primary placeholder:text-saas-secondary/50 focus:border-saas-accent focus:outline-none focus:ring-2 focus:ring-saas-accent/15 transition-all shadow-subtle disabled:bg-gray-50 disabled:opacity-50';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${inputClass} appearance-none pr-8 cursor-pointer`} {...props} />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-saas-secondary">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function NumberInput({
  unit,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { unit?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <input type="number" className={`${inputClass} w-28 ${className}`} {...rest} />
      {unit && <span className="text-xs font-medium text-saas-secondary">{unit}</span>}
    </span>
  );
}

export function CheckboxInput({
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-saas-primary cursor-pointer select-none">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-saas-border text-saas-accent focus:ring-saas-accent/20 cursor-pointer"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-tight text-saas-primary">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-relaxed text-saas-secondary">{hint}</span>}
    </label>
  );
}
