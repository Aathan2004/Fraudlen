import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';
import useAppStore, { getRiskLevel, RISK_LEVELS } from '../../store/useAppStore';
import RiskBadge, { PredictionBadge } from '../ui/RiskBadge';
import { SkeletonTable } from '../ui/Skeleton';
import {
  fmtInt, fmtPercent, fmtCurrency, fmtProbability,
} from '../../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = [
  { key: 'Provider', label: 'Provider ID', sortable: false },
  { key: 'Claim_Count', label: 'Claims', sortable: true },
  { key: 'Fraud_Claims', label: 'Fraud Claims', sortable: true },
  { key: 'Fraud_Probability', label: 'Avg Fraud Prob', sortable: true },
  { key: 'Fraud_Claim_Percentage', label: 'Fraud %', sortable: true },
  { key: 'Fraud_Prediction', label: 'Prediction', sortable: false },
  { key: '_risk', label: 'Risk Level', sortable: false },
];

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-accent-amber" />
    : <ChevronDown className="w-3 h-3 text-accent-amber" />;
}

export default function ProviderTable({ loading = false }) {
  const navigate = useNavigate();
  const {
    riskFilter, setRiskFilter,
    searchQuery, setSearchQuery,
    sortKey, sortDir, setSort,
    getFilteredProviders,
  } = useAppStore();

  const rows = getFilteredProviders();

  if (loading) return <SkeletonTable rows={8} />;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            type="text"
            placeholder="Search Provider ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Risk filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {RISK_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setRiskFilter(level)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150
                ${riskFilter === level
                  ? 'bg-accent-amber text-bg-base border-accent-amber'
                  : 'border-bg-border text-text-muted hover:border-text-dim hover:text-text-secondary'
                }`}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-text-dim">
          {rows.length} providers
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && setSort(col.key)}
                    className={col.sortable ? 'hover:text-text-primary' : '!cursor-default'}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <SortIcon colKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="text-center py-12 text-text-dim">
                      No providers match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((p, i) => {
                    const risk = getRiskLevel(p.Fraud_Probability);
                    return (
                      <motion.tr
                        key={p.Provider}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        onClick={() => navigate(`/providers/${p.Provider}`)}
                        className="hover:bg-bg-elevated cursor-pointer"
                      >
                        <td className="font-mono text-xs text-accent-amber font-medium">
                          {p.Provider}
                        </td>
                        <td className="tabular-nums">{fmtInt(p.Claim_Count)}</td>
                        <td className="tabular-nums text-risk-vhigh">{fmtInt(p.Fraud_Claims)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 rounded-full bg-bg-border overflow-hidden w-16"
                              title={`${fmtProbability(p.Fraud_Probability)}`}
                            >
                              <div
                                className="h-full rounded-full bg-accent-amber transition-all"
                                style={{ width: `${Math.min(p.Fraud_Probability * 100, 100)}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-xs">
                              {fmtProbability(p.Fraud_Probability)}
                            </span>
                          </div>
                        </td>
                        <td className="tabular-nums">{fmtPercent(p.Fraud_Claim_Percentage)}</td>
                        <td>
                          <PredictionBadge prediction={p.Fraud_Prediction} />
                        </td>
                        <td>
                          <RiskBadge level={risk} />
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
