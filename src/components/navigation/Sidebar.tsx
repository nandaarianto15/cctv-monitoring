/**
 * Enterprise Sidebar Navigation.
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
 * - Collapsible sidebar with clear active states.
 * - Brand identity at top.
 * - Mobile responsive drawer.
 */
import { useState } from 'react';
import type { VisionSnapshot, CameraSnapshot, TrackView } from '../../types';
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
  Shield,
  Cpu,
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
  icon: typeof LayoutDashboard;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'live', label: 'Live Monitoring', icon: Video },
  { id: 'workspace', label: 'Workspace Mapping', icon: Layers },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'activity', label: 'Activity History', icon: History },
  { id: 'cameras', label: 'Camera Management', icon: Camera },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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

  const liveCameraCount = snapshot.cameras.filter((c: CameraSnapshot) => c.status === 'running').length;
  const activeTracksCount = snapshot.cameras
    .flatMap((c: CameraSnapshot) => c.tracks)
    .filter((t: TrackView) => t.status === 'CONFIRMED').length;

  return (
    <>
      {/* Mobile Top Header (only visible on mobile screens) */}
      <div className="flex h-14 items-center justify-between border-b border-saas-border bg-white px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-saas-sidebar text-white">
            <Shield size={18} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-saas-primary">Vision AI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-saas-secondary hover:bg-saas-bg hover:text-saas-primary"
          aria-label="Toggle mobile menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-saas-sidebar text-slate-300 transition-all duration-200 ease-in-out md:static ${
          collapsed ? 'w-16' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } shadow-lg md:shadow-none border-r border-[#262B37]`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-saas-sidebar-border px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saas-accent text-white shadow-sm">
              <Shield size={20} strokeWidth={2.2} />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold tracking-tight text-white">VISION AI</span>
                <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                  Enterprise Monitor
                </span>
              </div>
            )}
          </div>
          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-md p-1.5 text-slate-400 hover:bg-saas-sidebar-hover hover:text-white md:flex"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Live Operational Status Widget */}
        <div className="border-b border-saas-sidebar-border px-3 py-3">
          {collapsed ? (
            <div className="flex justify-center" title={`${liveCameraCount} cameras live`}>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  liveCameraCount > 0 ? 'bg-saas-success animate-pulse' : 'bg-slate-500'
                }`}
              />
            </div>
          ) : (
            <div className="rounded-lg bg-[#1B1F28] p-2.5 border border-[#2B303C]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">ENGINE STATUS</span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      snapshot.modelsReady
                        ? 'bg-saas-success'
                        : snapshot.modelsLoading
                        ? 'bg-saas-warning animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  {snapshot.modelsReady
                    ? 'AI Ready'
                    : snapshot.modelsLoading
                    ? 'Loading...'
                    : 'Standby'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Cameras active</span>
                <span className="font-semibold text-white">{liveCameraCount}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-400">Live tracked</span>
                <span className="font-semibold text-white">{activeTracksCount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-saas-sidebar-active text-white border-l-2 border-saas-accent font-semibold'
                    : 'text-slate-400 hover:bg-saas-sidebar-hover hover:text-slate-200'
                }`}
              >
                <Icon
                  size={19}
                  className={`${
                    isActive ? 'text-saas-accent' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
                {!collapsed && item.id === 'live' && liveCameraCount > 0 && (
                  <span className="ml-auto rounded-full bg-saas-success/20 px-2 py-0.5 text-[10px] font-bold text-saas-success">
                    {liveCameraCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer (Privacy & System Info) */}
        <div className="border-t border-saas-sidebar-border p-3 text-xs">
          {collapsed ? (
            <div className="flex justify-center text-slate-500" title="Zero video persistence">
              <Cpu size={16} />
            </div>
          ) : (
            <div className="flex flex-col gap-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Shield size={12} className="text-saas-accent" />
                <span>Zero-Persistence Edge AI</span>
              </div>
              <p className="text-[10px] leading-tight text-slate-500 mt-0.5">
                Frames processed in-memory only. No biometrics or facial recognition.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
