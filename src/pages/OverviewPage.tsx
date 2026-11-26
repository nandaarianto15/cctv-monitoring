/**
 * Vyra - Overview Page.
 * Premium dark dashboard: calm blue accent, aurora depth, animated KPIs.
 * - Full-bleed layout (no frame, no outer padding - content padding inside).
 * - Greeting header with live clock & streaming status.
 * - KPI band: uniform tiles, blue glow appears on hover (no permanent highlight).
 * - Occupancy donut, camera health list, dark-themed empty states everywhere.
 * - Bilingual EN/ID via optional `lang` prop (default 'en').
 * - Self-contained styling, no tailwind.config changes required.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useCameras, useEmployeeNames, useEmployees, useEvents, useVisionSnapshot } from '../hooks/useVision';
import { EventFeed } from '../components/dashboard/EventFeed';
import { Video, Users, Activity, Shield, Camera, ArrowRight } from '../components/icons';
import type { PageId } from '../components/navigation/Sidebar';

const RECENT_EVENTS = 15;

type Lang = 'en' | 'id';

const S = {
  overline: { en: 'Workspace Overview', id: 'Ringkasan Ruang Kerja' },
  engineReady: { en: 'AI engine ready', id: 'Engine AI siap' },
  engineLoading: { en: 'Loading models…', id: 'Memuat model…' },
  engineStandby: { en: 'Engine standby', id: 'Engine siaga' },
  ctaLive: { en: 'Open Live Monitoring', id: 'Buka Pemantauan Langsung' },
  kpiCameras: { en: 'Active Cameras', id: 'Kamera Aktif' },
  kpiPersons: { en: 'Persons Tracked', id: 'Orang Terlacak' },
  kpiDesks: { en: 'Desks Occupied', id: 'Meja Terisi' },
  kpiEmployees: { en: 'Employees', id: 'Karyawan' },
  kpiEvents: { en: 'Telemetry Events', id: 'Peristiwa Telemetri' },
  configured: { en: 'configured', id: 'terkonfigurasi' },
  identified: { en: 'identified', id: 'teridentifikasi' },
  noZones: { en: 'No zones mapped', id: 'Belum ada zona' },
  available: { en: 'available', id: 'tersedia' },
  onSite: { en: 'on-site now', id: 'di lokasi' },
  rollingBuffer: { en: 'Rolling buffer', id: 'Buffer bergulir' },
  camTitle: { en: 'Camera Feeds', id: 'Umpan Kamera' },
  camSub: { en: 'Live operational status per source', id: 'Status operasional tiap sumber' },
  manage: { en: 'Manage', id: 'Kelola' },
  viewFeed: { en: 'View Feed', id: 'Lihat Umpan' },
  mapDesks: { en: 'Map Desks', id: 'Petakan Meja' },
  offline: { en: 'Camera offline', id: 'Kamera offline' },
  tracked: { en: 'tracked', id: 'terlacak' },
  desksWord: { en: 'desks', id: 'meja' },
  emptyTitle: { en: 'No camera sources yet', id: 'Belum ada sumber kamera' },
  emptyHint: {
    en: 'Add a camera in Camera Management to start receiving vision telemetry.',
    id: 'Tambahkan kamera di Manajemen Kamera untuk mulai menerima telemetri visual.',
  },
  actTitle: { en: 'Recent Activity', id: 'Aktivitas Terbaru' },
  actSub: { en: 'Occupancy & posture transitions in real time', id: 'Transisi okupansi & postur secara langsung' },
  actEmptyTitle: { en: 'No activity yet', id: 'Belum ada aktivitas' },
  actEmptyHint: {
    en: 'Events will appear here as cameras detect occupancy and posture transitions.',
    id: 'Peristiwa akan muncul di sini saat kamera mendeteksi transisi okupansi dan postur.',
  },
  fullHistory: { en: 'Full History', id: 'Riwayat Lengkap' },
  setupTitle: { en: 'Welcome to Vyra', id: 'Selamat datang di Vyra' },
  setupSub: { en: 'Four steps to your first live insight', id: 'Empat langkah menuju insight langsung pertama' },
  setupCta: { en: 'Configure Camera', id: 'Konfigurasi Kamera' },
} as const;

const SETUP_STEPS: Array<{ title: { en: string; id: string }; desc: { en: string; id: string } }> = [
  {
    title: { en: 'Connect Camera', id: 'Hubungkan Kamera' },
    desc: {
      en: 'Add a webcam, USB camera, or phone as a source.',
      id: 'Tambahkan webcam, kamera USB, atau ponsel sebagai sumber.',
    },
  },
  {
    title: { en: 'Start AI Stream', id: 'Mulai Aliran AI' },
    desc: {
      en: 'Detection models load directly in the browser - no server round-trip.',
      id: 'Model deteksi berjalan langsung di browser - tanpa server.',
    },
  },
  {
    title: { en: 'Map Desks', id: 'Petakan Meja' },
    desc: {
      en: 'Draw zone boundaries for the areas you want to watch.',
      id: 'Gambar batas zona untuk area yang ingin dipantau.',
    },
  },
  {
    title: { en: 'Assign & Monitor', id: 'Tetapkan & Pantau' },
    desc: {
      en: 'Link employees to confirmed tracks and watch the overview come alive.',
      id: 'Tautkan karyawan ke jalur terkonfirmasi dan pantau ringkasannya.',
    },
  },
];

function getGreeting(hour: number, lang: Lang): string {
  if (lang === 'id') {
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Ticking clock (1s). */
function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Number that counts up on mount, then rolls smoothly toward live updates. */
function useSmoothNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  useEffect(() => {
    const from = displayRef.current;
    if (from === target) {
      setDisplay(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (target - from) * eased);
      displayRef.current = val;
      setDisplay(val);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

/** Small occupancy donut with animated arc. */
function OccupancyDonut({ occupied, total, title }: { occupied: number; total: number; title?: string }) {
  const gradId = useId().replace(/:/g, '');
  const pct = total > 0 ? occupied / total : 0;
  const r = 21;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-12 w-12 shrink-0" title={title}>
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={`${(c * pct).toFixed(2)} ${c.toFixed(2)}`}
          className="transition-[stroke-dasharray] duration-500"
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A8C4FF" />
            <stop offset="100%" stopColor="#5D87E8" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-[#C6CFDC]">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

/** KPI tile - count-up value; the blue glow is earned on hover, never permanent. */
function KpiTile({
  label,
  value,
  sub,
  icon,
  aside,
  delay = 0,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon?: ReactNode;
  aside?: ReactNode;
  delay?: number;
}) {
  const numeric = typeof value === 'number' ? value : 0;
  const smooth = useSmoothNumber(numeric);
  return (
    <div
      className="vyra-rise group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#7AA2F7]/25 hover:bg-[#7AA2F7]/[0.04] hover:shadow-[0_14px_40px_-16px_rgba(122,162,247,0.45)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Hover-only radial highlight - invisible until the card is touched */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(122,162,247,0.12),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6474]">{label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#E8ECF4]">
            {typeof value === 'number' ? smooth : value}
          </p>
          {sub && <p className="mt-2 truncate text-[11px] text-[#67717F]">{sub}</p>}
        </div>
        {aside ? (
          aside
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-[#7E8899] transition-colors duration-300 group-hover:border-[#7AA2F7]/25 group-hover:bg-[#7AA2F7]/10 group-hover:text-[#A8C4FF]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/** Rounded panel with title / subtitle / action header. */
function Panel({
  title,
  subtitle,
  action,
  children,
  delay = 0,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="vyra-rise overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[#E8ECF4]">{title}</h2>
          <p className="mt-0.5 text-[11px] text-[#5A6474]">{subtitle}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Dark-themed empty state - no gray boxes, stays on the dark canvas. */
function EmptyBlock({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-[#5A6474]">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-[#96A0B0]">{title}</p>
      <p className="max-w-xs text-[11.5px] leading-relaxed text-[#5A6474]">{hint}</p>
    </div>
  );
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-[#96A0B0] transition-colors hover:border-white/[0.16] hover:text-[#E8ECF4]"
    >
      {children}
    </button>
  );
}

function SoftButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-[#7AA2F7]/25 bg-[#7AA2F7]/10 px-2.5 py-1 text-[11px] font-semibold text-[#A8C4FF] transition-colors hover:border-[#7AA2F7]/40 hover:bg-[#7AA2F7]/20"
    >
      {children}
    </button>
  );
}

function HeaderPill({ tone, dot = false, children }: { tone: 'green' | 'amber' | 'neutral'; dot?: boolean; children: ReactNode }) {
  const tones = {
    green: 'border-[#4ADE80]/20 bg-[#4ADE80]/[0.08] text-[#6EE7A0]',
    amber: 'border-[#E8A33D]/25 bg-[#E8A33D]/[0.08] text-[#E8B25C]',
    neutral: 'border-white/[0.08] bg-white/[0.03] text-[#96A0B0]',
  } as const;
  const dots = { green: 'bg-[#4ADE80]', amber: 'bg-[#E8A33D]', neutral: 'bg-[#7E8899]' } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]} ${tone !== 'neutral' ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  );
}

function StatusPill({ status, lang }: { status: string; lang: Lang }) {
  const map: Record<string, { en: string; id: string; cls: string; dot: string }> = {
    running: { en: 'Live', id: 'Langsung', cls: 'border-[#4ADE80]/20 bg-[#4ADE80]/[0.08] text-[#6EE7A0]', dot: 'bg-[#4ADE80]' },
    error: { en: 'Error', id: 'Gagal', cls: 'border-[#F87171]/20 bg-[#F87171]/[0.08] text-[#F8A5A5]', dot: 'bg-[#F87171]' },
    idle: { en: 'Idle', id: 'Siaga', cls: 'border-white/[0.08] bg-white/[0.03] text-[#7E8899]', dot: 'bg-[#7E8899]' },
  };
  const s = map[status] ?? { en: 'Offline', id: 'Offline', cls: 'border-white/[0.08] bg-white/[0.03] text-[#7E8899]', dot: 'bg-[#5A6474]' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === 'running' ? 'animate-pulse' : ''}`} />
      {lang === 'en' ? s.en : s.id}
    </span>
  );
}

export function OverviewPage({
  navigate,
  lang = 'en',
}: {
  navigate: (page: PageId) => void;
  lang?: Lang;
}): JSX.Element {
  const snapshot = useVisionSnapshot();
  const cameras = useCameras();
  const employees = useEmployees();
  const employeeNames = useEmployeeNames();
  const events = useEvents();
  const clock = useClock();

  const T = (o: { en: string; id: string }) => (lang === 'en' ? o.en : o.id);

  const liveCameras = snapshot.cameras.filter((c) => c.status === 'running');
  const confirmedPersons = snapshot.cameras.flatMap((c) => c.tracks).filter((t) => t.status === 'CONFIRMED');
  const desks = snapshot.cameras.flatMap((c) => c.desks);
  const occupiedDesks = desks.filter((d) => d.state === 'OCCUPIED');
  const identifiedPersons = confirmedPersons.filter((t) => t.employeeId !== null);

  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [locale]
  );
  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    [locale]
  );
  const greeting = getGreeting(clock.getHours(), lang);
  const streamingLine =
    lang === 'id'
      ? `${liveCameras.length} dari ${cameras.length} kamera menyiarkan`
      : `${liveCameras.length} of ${cameras.length} cameras streaming`;

  return (
    <div className="relative min-h-full bg-gradient-to-b from-[#0D1119] via-[#0A0D13] to-[#090C11] text-[#96A0B0]">
      <style>{`
        @keyframes vyraRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .vyra-rise { animation: vyraRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .vyra-rise { animation: none; } }
      `}</style>

      {/* Ambient depth: aurora glow + faint blueprint grid, fading downward */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_45%_at_50%_-12%,rgba(122,162,247,0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)] [background-image:linear-gradient(rgba(148,163,198,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,198,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative flex flex-col gap-6 p-5 md:p-7 lg:p-8">
        {/* Header - greeting, live clock, engine status, CTA */}
        <header className="vyra-rise flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A6474]">
              {T(S.overline)}
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#E8ECF4] md:text-[30px]">
              {greeting}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#67717F]">
              <span className="text-[#96A0B0]">{dateFmt.format(clock)}</span>
              <span className="text-[#3A424E]">·</span>
              <span className="tabular-nums">{timeFmt.format(clock)}</span>
              <span className="text-[#3A424E]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    liveCameras.length > 0 ? 'animate-pulse bg-[#4ADE80]' : 'bg-[#5A6474]'
                  }`}
                />
                {streamingLine}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {snapshot.modelsReady ? (
              <HeaderPill tone="green" dot>{T(S.engineReady)}</HeaderPill>
            ) : snapshot.modelsLoading ? (
              <HeaderPill tone="amber" dot>{T(S.engineLoading)}</HeaderPill>
            ) : (
              <HeaderPill tone="neutral" dot>{T(S.engineStandby)}</HeaderPill>
            )}
            <button
              onClick={() => navigate('live')}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5D87E8] to-[#7AA2F7] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(122,162,247,0.65)] transition-all duration-200 hover:brightness-110"
            >
              {T(S.ctaLive)}
              <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </header>

        {/* First-run setup guide */}
        {cameras.length === 0 && (
          <section
            className="vyra-rise rounded-2xl border border-[#7AA2F7]/15 bg-white/[0.02] p-5 md:p-6"
            style={{ animationDelay: '60ms' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#E8ECF4]">{T(S.setupTitle)}</h2>
                <p className="mt-1 text-[12px] text-[#67717F]">{T(S.setupSub)}</p>
              </div>
              <button
                onClick={() => navigate('cameras')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5D87E8] to-[#7AA2F7] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(122,162,247,0.65)] transition-all duration-200 hover:brightness-110"
              >
                <Camera size={14} />
                {T(S.setupCta)}
              </button>
            </div>
            <ol className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {SETUP_STEPS.map((step, i) => (
                <li key={step.title.en} className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7AA2F7] to-[#5D87E8] text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(122,162,247,0.4)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#E8ECF4]">{T(step.title)}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#67717F]">{T(step.desc)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* KPI band - all tiles uniform; glow is a hover reward */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <KpiTile
            label={T(S.kpiCameras)}
            value={liveCameras.length}
            sub={`${cameras.length} ${T(S.configured)}`}
            icon={<Video size={15} />}
            delay={120}
          />
          <KpiTile
            label={T(S.kpiPersons)}
            value={confirmedPersons.length}
            sub={`${identifiedPersons.length} ${T(S.identified)}`}
            icon={<Users size={15} />}
            delay={190}
          />
          <KpiTile
            label={T(S.kpiDesks)}
            value={`${occupiedDesks.length} / ${desks.length}`}
            sub={desks.length === 0 ? T(S.noZones) : `${desks.length - occupiedDesks.length} ${T(S.available)}`}
            aside={<OccupancyDonut occupied={occupiedDesks.length} total={desks.length} title={`${occupiedDesks.length}/${desks.length}`} />}
            delay={260}
          />
          <KpiTile
            label={T(S.kpiEmployees)}
            value={employees.length}
            sub={`${identifiedPersons.length} ${T(S.onSite)}`}
            icon={<Shield size={15} />}
            delay={330}
          />
          <KpiTile
            label={T(S.kpiEvents)}
            value={events.length}
            sub={T(S.rollingBuffer)}
            icon={<Activity size={15} />}
            delay={400}
          />
        </div>

        {/* Main grid: camera health + recent activity */}
        <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <Panel
            title={T(S.camTitle)}
            subtitle={T(S.camSub)}
            action={<GhostButton onClick={() => navigate('cameras')}>{T(S.manage)}</GhostButton>}
            delay={460}
          >
            {cameras.length === 0 ? (
              <EmptyBlock
                icon={<Video size={18} />}
                title={T(S.emptyTitle)}
                hint={T(S.emptyHint)}
              />
            ) : (
              <ul className="p-2.5">
                {cameras.map((camera) => {
                  const cam = snapshot.cameras.find((c) => c.cameraId === camera.id);
                  const status = cam?.status ?? 'idle';
                  const camZones = cam?.desks ?? [];
                  const occupied = camZones.filter((d) => d.state === 'OCCUPIED').length;
                  const isRunning = status === 'running' && !!cam;
                  return (
                    <li
                      key={camera.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-2.5 py-3 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                          <Video size={15} className={isRunning ? 'text-[#9DB9FF]' : 'text-[#5A6474]'} />
                          {isRunning && (
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-[#4ADE80] ring-2 ring-[#10141C]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[13.5px] font-semibold text-[#E8ECF4]">{camera.label}</span>
                            <StatusPill status={status} lang={lang} />
                          </div>
                          <p className="mt-0.5 truncate text-[11.5px] text-[#67717F]">
                            {isRunning && cam
                              ? `${cam.tracks.length} ${T(S.tracked)} · ${occupied}/${camZones.length} ${T(S.desksWord)}`
                              : status === 'error' && cam?.error
                              ? cam.error
                              : T(S.offline)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Desk occupancy pips */}
                        {isRunning && camZones.length > 0 && camZones.length <= 12 && (
                          <div className="hidden items-center gap-[3px] sm:flex" title={`${occupied}/${camZones.length} ${T(S.desksWord)}`}>
                            {camZones.map((z, i) => (
                              <span
                                key={i}
                                className={`h-[7px] w-[7px] rounded-[2px] transition-colors ${
                                  z.state === 'OCCUPIED'
                                    ? 'bg-[#7AA2F7]/80 shadow-[0_0_5px_rgba(122,162,247,0.45)]'
                                    : 'bg-white/[0.1]'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        {/* Inference FPS meter */}
                        {isRunning && cam && (
                          <div className="hidden w-14 flex-col gap-1 lg:flex" title={`${cam.stats.inferenceFps.toFixed(1)} FPS`}>
                            <span className="text-right text-[10px] font-medium tabular-nums text-[#67717F]">
                              {cam.stats.inferenceFps.toFixed(1)} fps
                            </span>
                            <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#5D87E8] to-[#A8C4FF] transition-[width] duration-700"
                                style={{ width: `${Math.min((cam.stats.inferenceFps / 30) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {isRunning && <SoftButton onClick={() => navigate('live')}>{T(S.viewFeed)}</SoftButton>}
                        {camZones.length === 0 && (
                          <button
                            onClick={() => navigate('workspace')}
                            className="group/btn inline-flex items-center gap-1 text-[11px] font-medium text-[#67717F] transition-colors hover:text-[#C6CFDC]"
                          >
                            {T(S.mapDesks)}
                            <ArrowRight size={12} className="transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title={T(S.actTitle)}
            subtitle={T(S.actSub)}
            action={<GhostButton onClick={() => navigate('activity')}>{T(S.fullHistory)}</GhostButton>}
            delay={520}
          >
            {events.length === 0 ? (
              <EmptyBlock
                icon={<Activity size={18} />}
                title={T(S.actEmptyTitle)}
                hint={T(S.actEmptyHint)}
              />
            ) : (
              /* NOTE: EventFeed keeps its own internal styling for now -
                  send EventFeed.tsx next to unify it with the Vyra dark theme. */
              <div className="px-3 pb-3 pt-1">
                <EventFeed
                  events={events}
                  cameras={cameras}
                  employeeNames={employeeNames}
                  limit={RECENT_EVENTS}
                />
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}