import { create } from 'zustand';

interface TableState {
  searchQuery: string;
  selectedRole: string | null;
  setSearchQuery: (query: string) => void;
  setSelectedRole: (role: string | null) => void;
  clearFilters: () => void;
}

export const useTableStore = create<TableState>((set) => ({
  searchQuery: "",
  selectedRole: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedRole: (role) => set({ selectedRole: role }),

  clearFilters: () => set({ searchQuery: "", selectedRole: null })
}));
