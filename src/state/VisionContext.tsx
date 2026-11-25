/**
 * Vision context: one controller instance per app, wired to localStorage.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CONFIG, type AppConfig, type ConfigOverrides } from '../config';
import { VisionController } from '../services/controller/VisionController';
import { LocalStorageRepository } from '../services/repository/LocalStorageRepository';

export interface VisionContextValue {
  controller: VisionController;
  config: AppConfig;
  updateConfig: (overrides: ConfigOverrides) => void;
  resetConfig: () => void;
}

const VisionContext = createContext<VisionContextValue | null>(null);

export function VisionProvider({ children }: { children: ReactNode }): JSX.Element {
  const [controller] = useState(() => {
    const repository = new LocalStorageRepository(
      globalThis.localStorage,
      DEFAULT_CONFIG.events.retentionLimit,
    );
    return new VisionController(repository, repository.getConfigOverrides());
  });
  const [config, setConfig] = useState<AppConfig>(() => controller.currentConfig);

  useEffect(() => {
    // Stop cameras and free models when the app unmounts (full cleanup).
    return () => controller.dispose();
  }, [controller]);

  const value = useMemo<VisionContextValue>(
    () => ({
      controller,
      config,
      updateConfig: (overrides: ConfigOverrides) => {
        controller.updateConfig(overrides);
        setConfig({ ...controller.currentConfig });
      },
      resetConfig: () => {
        controller.resetConfig();
        setConfig({ ...controller.currentConfig });
      },
    }),
    [controller, config],
  );

  return <VisionContext.Provider value={value}>{children}</VisionContext.Provider>;
}

export function useVision(): VisionContextValue {
  const ctx = useContext(VisionContext);
  if (!ctx) {
    throw new Error('useVision must be used inside <VisionProvider>');
  }
  return ctx;
}
