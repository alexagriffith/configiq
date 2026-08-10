'use client';

import * as React from 'react';
import { loadAppConfig, getAppConfig } from '@/lib/app-config';

export type InferenceBackend = 'vllm' | 'tensorrt-llm' | 'sglang';

const STORAGE_KEYS = {
  defaultModel: 'settings_default_model',
  hfToken: 'hf_token',
  inferenceBackend: 'settings_inference_backend',
  backendVersion: 'settings_backend_version',
} as const;

interface SettingsState {
  hydrated: boolean;
  defaultModel: string;
  hfToken: string;
  inferenceBackend: InferenceBackend;
  backendVersion: string;
  setDefaultModel: (v: string) => void;
  setHfToken: (v: string) => void;
  setInferenceBackend: (v: InferenceBackend) => void;
  setBackendVersion: (v: string) => void;
}

const SettingsContext = React.createContext<SettingsState>({
  hydrated: false,
  defaultModel: '',
  hfToken: '',
  inferenceBackend: 'vllm',
  backendVersion: '',
  setDefaultModel: () => {},
  setHfToken: () => {},
  setInferenceBackend: () => {},
  setBackendVersion: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = React.useState(false);
  const [defaultModel, setDefaultModelState] = React.useState('');
  const [hfToken, setHfTokenState] = React.useState('');
  const [inferenceBackend, setInferenceBackendState] = React.useState<InferenceBackend>('vllm');
  const [backendVersion, setBackendVersionState] = React.useState('');

  React.useEffect(() => {
    async function init() {
      // Load config.json first — gives us the defaults to fall back to
      const config = await loadAppConfig();

      // localStorage overrides config; null means "never saved by user" so use config default
      const savedModel = localStorage.getItem(STORAGE_KEYS.defaultModel);
      setDefaultModelState(savedModel !== null ? savedModel : config.defaultModel);

      setHfTokenState(localStorage.getItem(STORAGE_KEYS.hfToken) ?? '');

      const savedBackend = localStorage.getItem(STORAGE_KEYS.inferenceBackend) as InferenceBackend | null;
      const activeBackend: InferenceBackend = savedBackend ?? config.defaultBackend as InferenceBackend;
      setInferenceBackendState(activeBackend);

      const savedVersion = localStorage.getItem(STORAGE_KEYS.backendVersion);
      setBackendVersionState(savedVersion !== null ? savedVersion : (config.backendVersions[activeBackend] ?? ''));

      setHydrated(true);
    }
    init();
  }, []);

  const setDefaultModel = React.useCallback((v: string) => {
    setDefaultModelState(v);
    localStorage.setItem(STORAGE_KEYS.defaultModel, v);
  }, []);

  const setHfToken = React.useCallback((v: string) => {
    setHfTokenState(v);
    if (v) {
      localStorage.setItem(STORAGE_KEYS.hfToken, v);
    } else {
      localStorage.removeItem(STORAGE_KEYS.hfToken);
    }
  }, []);

  const setInferenceBackend = React.useCallback((v: InferenceBackend) => {
    setInferenceBackendState(v);
    localStorage.setItem(STORAGE_KEYS.inferenceBackend, v);
    // Reset version to config default for the new backend
    const defaultVersion = getAppConfig().backendVersions[v] ?? '';
    setBackendVersionState(defaultVersion);
    localStorage.setItem(STORAGE_KEYS.backendVersion, defaultVersion);
  }, []);

  const setBackendVersion = React.useCallback((v: string) => {
    setBackendVersionState(v);
    localStorage.setItem(STORAGE_KEYS.backendVersion, v);
  }, []);

  const value = React.useMemo<SettingsState>(
    () => ({ hydrated, defaultModel, hfToken, inferenceBackend, backendVersion, setDefaultModel, setHfToken, setInferenceBackend, setBackendVersion }),
    [hydrated, defaultModel, hfToken, inferenceBackend, backendVersion, setDefaultModel, setHfToken, setInferenceBackend, setBackendVersion],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsState {
  return React.useContext(SettingsContext);
}
