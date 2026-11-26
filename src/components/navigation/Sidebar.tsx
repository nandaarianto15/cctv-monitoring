/**
 * Vyra - Sidebar Navigation.
 * Strict Requirement:
 * - LEFT SIDEBAR only, NO TOP NAVBAR.
 * - Navigation items:
 *   1. Overview
 *   2. Live Monitoring
 *   3. Workspace Mapping
 *   4. Employees
 *   5. Activity History
 *   6. Camera Management
 *   7. Settings
 * - Collapsible sidebar (edge handle, vertically centered).
 * - Brand identity at top (Vyra) + language toggle top-right.
 * - Mobile responsive drawer.
 * - Self-contained color tokens (no tailwind.config changes required).
 */
import { useState, useId } from 'react';
import type { VisionSnapshot, CameraSnapshot } from '../../types';
import {
  LayoutDashboard,
  Video,
  Layers,
  Users,
  History,
  Camera,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from '../icons';

export type PageId =
  | 'overview'
  | 'live'
  | 'workspace'
  | 'employees'
  | 'activity'
  | 'cameras'
  | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  labelId: string;
  icon: typeof LayoutDashboard;
}

type Lang = 'en' | 'id';

const NAV_SECTIONS: Array<{ en: string; id: string; items: NavItem[] }> = [
  {
    en: 'Monitor',
    id: 'Pantau',
    items: [
      { id: 'overview', label: 'Overview', labelId: 'Ringkasan', icon: LayoutDashboard },
      { id: 'live', label: 'Live Monitoring', labelId: 'Pemantauan Langsung', icon: Video },
      { id: 'workspace', label: 'Workspace Mapping', labelId: 'Pemetaan Area', icon: Layers },
    ],
  },
  {
    en: 'Manage',
    id: 'Kelola',
    items: [
      { id: 'employees', label: 'Employees', labelId: 'Karyawan', icon: Users },
      { id: 'activity', label: 'Activity History', labelId: 'Riwayat Aktivitas', icon: History },
      { id: 'cameras', label: 'Camera Management', labelId: 'Manajemen Kamera', icon: Camera },
    ],
  },
  {
    en: 'System',
    id: 'Sistem',
    items: [{ id: 'settings', label: 'Settings', labelId: 'Pengaturan', icon: Settings }],
  },
];

const STRINGS = {
  brandSub: { en: 'AI Monitoring', id: 'Pemantauan AI' },
} as const;

/** Vyra brand mark - geometric "V" with a calm blue gradient. */
function VyraMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  const gradId = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A9C6FF" />
          <stop offset="100%" stopColor="#5B82E8" />
        </linearGradient>
      </defs>
      <path
        d="M3.5 4.5h3.65L12 16.2l4.85-11.7h3.65L13.6 20.5h-3.2L3.5 4.5Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

export function Sidebar({
  activePage,
  onNavigate,
  snapshot,
  collapsed,
  onToggleCollapse,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  snapshot: VisionSnapshot;
  collapsed: boolean;
  onToggleCollapse: () => void;
}): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  const isCollapsed = collapsed && !mobileOpen;
  const liveCameraCount = snapshot.cameras.filter(
    (c: CameraSnapshot) => c.status === 'running'
  ).length;

  return (
    <>
      {/* Mobile Top Header (only visible on mobile screens) */}
      <div className="flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0A0D13] px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <VyraMark size={20} />
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#E8ECF4]">
              Vyra
            </span>
            <span className="mt-[3px] text-[8.5px] font-medium uppercase tracking-[0.16em] text-[#5A6474]">
              {STRINGS.brandSub[lang]}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-[#96A0B0] transition-colors hover:bg-white/[0.05] hover:text-white"
          aria-label="Toggle mobile menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#05070B]/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0D1119] via-[#0A0D13] to-[#090C11] text-[#96A0B0] shadow-[0_0_40px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out md:static md:shadow-none ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="relative flex h-full flex-1 flex-col">
          {/* Subtle top aurora - depth without noise */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(65%_55%_at_50%_0%,rgba(122,162,247,0.08),transparent_70%)]" />

          {/* Brand Header + Language Toggle */}
          <div
            className={`flex h-16 shrink-0 items-center border-b border-white/[0.06] ${
              isCollapsed
                ? 'flex-col justify-center gap-1.5 px-2'
                : 'justify-between pl-4 pr-3'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <VyraMark
                size={23}
                className="shrink-0 drop-shadow-[0_2px_8px_rgba(122,162,247,0.35)]"
              />
              {!isCollapsed && (
                <div className="flex flex-col leading-none">
                  <span className="text-[17px] font-semibold tracking-[-0.01em] text-[#E8ECF4]">
                    Vyra
                  </span>
                  <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-[#5A6474]">
                    {STRINGS.brandSub[lang]}
                  </span>
                </div>
              )}
            </div>

            {/* Language Switch - sliding segmented pill */}
            {!isCollapsed ? (
              <div
                className="relative flex shrink-0 items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-[3px]"
                role="group"
                aria-label="Language"
              >
                <span
                  className={`absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%-3px)] rounded-full bg-[#7AA2F7]/[0.2] shadow-[0_0_12px_rgba(122,162,247,0.2)] transition-transform duration-200 ease-out ${
                    lang === 'id' ? 'translate-x-full' : 'translate-x-0'
                  }`}
                />
                {(['en', 'id'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`relative z-10 px-2 py-[3px] text-[10px] font-semibold uppercase leading-none transition-colors ${
                      lang === l
                        ? 'text-[#A8C4FF]'
                        : 'text-[#67717F] hover:text-[#96A0B0]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
                className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-tight text-[#8A94A6] transition-colors hover:border-[#7AA2F7]/40 hover:text-[#9DB9FF]"
                title="Switch language / Ganti bahasa"
              >
                {lang}
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-4">
            {NAV_SECTIONS.map((section, idx) => (
              <div key={section.en} className={idx === 0 ? '' : isCollapsed ? 'mt-1' : 'mt-5'}>
                {isCollapsed ? (
                  idx > 0 && (
                    <div className="mx-auto mb-3 mt-2 w-6 border-t border-white/[0.07]" />
                  )
                ) : (
                  <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#4E5866]">
                    {lang === 'en' ? section.en : section.id}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    const label = lang === 'en' ? item.label : item.labelId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setMobileOpen(false);
                        }}
                        title={isCollapsed ? label : undefined}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group relative flex items-center transition-all duration-200 outline-none ${
                          isCollapsed
                            ? 'mx-auto h-10 w-10 justify-center rounded-xl'
                            : 'w-full gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium'
                        } ${
                          isActive
                            ? isCollapsed
                              ? 'bg-[#7AA2F7]/[0.14] text-white ring-1 ring-[#7AA2F7]/25'
                              : 'bg-gradient-to-r from-[#7AA2F7]/[0.14] via-[#7AA2F7]/[0.07] to-transparent text-white shadow-[0_8px_24px_-10px_rgba(122,162,247,0.35)]'
                            : isCollapsed
                            ? 'text-[#96A0B0] hover:bg-white/[0.04] hover:text-[#DDE4EE]'
                            : 'text-[#96A0B0] hover:bg-white/[0.04] hover:text-[#DDE4EE]'
                        }`}
                      >
                        {/* Active indicator bar */}
                        {isActive && !isCollapsed && (
                          <span className="absolute left-1 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[#A8C4FF] to-[#5D87E8] shadow-[0_0_10px_rgba(122,162,247,0.6)]" />
                        )}
                        <Icon
                          size={17}
                          strokeWidth={isActive ? 2 : 1.8}
                          className={`shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#9DB9FF]'
                              : 'text-[#67717F] group-hover:text-[#96A0B0]'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{label}</span>}
                        {!isCollapsed && item.id === 'live' && liveCameraCount > 0 && (
                          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-[#4ADE80]/20 bg-[#4ADE80]/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#6EE7A0]">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-current" />
                            {liveCameraCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Collapse Handle - floating on the sidebar edge, vertically centered */}
          <button
            onClick={onToggleCollapse}
            className="absolute right-0 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-[#151B27] text-[#7C8698] shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-colors duration-200 hover:border-[#7AA2F7]/50 hover:text-[#9DB9FF] hover:shadow-[0_4px_18px_rgba(122,162,247,0.25)] md:flex"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </aside>
    </>
  );
}