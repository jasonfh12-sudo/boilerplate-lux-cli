import { create } from 'zustand';

interface MatchingOrg {
  id: string;
  name: string;
  slug: string;
}

type Step = "checking" | "join-or-create" | "create";

interface AuthCallbackState {
  error: string;
  newOrgName: string;
  allowDomainAutoJoin: boolean;
  isLoading: boolean;
  step: Step;
  userEmail: string;
  matchingOrgs: MatchingOrg[];
  selectedOrgId: string;
  createNewOrg: boolean;

  setError: (error: string) => void;
  setNewOrgName: (name: string) => void;
  setAllowDomainAutoJoin: (allow: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setStep: (step: Step) => void;
  setUserEmail: (email: string) => void;
  setMatchingOrgs: (orgs: MatchingOrg[]) => void;
  setSelectedOrgId: (id: string) => void;
  setCreateNewOrg: (create: boolean) => void;
  reset: () => void;
}

const initialState = {
  error: "",
  newOrgName: "",
  allowDomainAutoJoin: false,
  isLoading: false,
  step: "checking" as Step,
  userEmail: "",
  matchingOrgs: [],
  selectedOrgId: "",
  createNewOrg: false,
};

export const useAuthCallbackStore = create<AuthCallbackState>((set) => ({
  ...initialState,

  setError: (error) => set({ error }),
  setNewOrgName: (newOrgName) => set({ newOrgName }),
  setAllowDomainAutoJoin: (allowDomainAutoJoin) => set({ allowDomainAutoJoin }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setStep: (step) => set({ step }),
  setUserEmail: (userEmail) => set({ userEmail }),
  setMatchingOrgs: (matchingOrgs) => set({ matchingOrgs }),
  setSelectedOrgId: (selectedOrgId) => set({ selectedOrgId }),
  setCreateNewOrg: (createNewOrg) => set({ createNewOrg }),
  reset: () => set(initialState),
}));
