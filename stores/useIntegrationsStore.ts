import { create } from 'zustand';

interface IntegrationsState {
  selectedIntegration: string | null;
  setSelectedIntegration: (integration: string | null) => void;
  toggleIntegration: (integration: string) => void;
}

export const useIntegrationsStore = create<IntegrationsState>((set) => ({
  selectedIntegration: null,

  setSelectedIntegration: (integration) =>
    set({ selectedIntegration: integration }),

  toggleIntegration: (integration) =>
    set((state) => ({
      selectedIntegration: state.selectedIntegration === integration ? null : integration
    }))
}));
