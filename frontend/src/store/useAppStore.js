import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // ── Analysis state ───────────────────────────────────────────
  hasAnalysis: false,
  dashboard: null,
  providers: [],
  totalProviders: 0,

  // ── UI state ─────────────────────────────────────────────────
  riskFilter: 'All',         // filter applied to providers table
  searchQuery: '',           // provider ID search
  sortKey: 'Fraud_Probability',
  sortDir: 'desc',

  // ── Actions ──────────────────────────────────────────────────
  setDashboard: (data) => set({ dashboard: data }),
  setProviders: (total, list) => set({ providers: list, totalProviders: total }),
  setHasAnalysis: (v) => set({ hasAnalysis: v }),
  setRiskFilter: (v) => set({ riskFilter: v }),
  setSearchQuery: (v) => set({ searchQuery: v }),
  setSort: (key) => {
    const { sortKey, sortDir } = get();
    if (sortKey === key) {
      set({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortKey: key, sortDir: 'desc' });
    }
  },

  // ── Derived: filtered + sorted provider list ─────────────────
  getFilteredProviders: () => {
    const { providers, riskFilter, searchQuery, sortKey, sortDir } = get();
    let result = [...providers];

    // Risk filter
    if (riskFilter !== 'All') {
      result = result.filter((p) => getRiskLevel(p.Fraud_Probability) === riskFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) =>
        String(p.Provider).toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return result;
  },

  // ── Reset after new upload ───────────────────────────────────
  reset: () =>
    set({
      hasAnalysis: false,
      dashboard: null,
      providers: [],
      totalProviders: 0,
      riskFilter: 'All',
      searchQuery: '',
      sortKey: 'Fraud_Probability',
      sortDir: 'desc',
    }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────

export const getRiskLevel = (prob) => {
  if (prob == null) return 'Low';
  if (prob >= 0.75) return 'Very High';
  if (prob >= 0.55) return 'High';
  if (prob >= 0.35) return 'Medium';
  return 'Low';
};

export const RISK_LEVELS = ['All', 'Very High', 'High', 'Medium', 'Low'];

export default useAppStore;
