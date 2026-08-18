import { useNavigate } from 'react-router-dom';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { getRiskLevel } from '../../store/useAppStore';
import RiskBadge from '../ui/RiskBadge';
import { fmtProbability } from '../../utils/formatters';
import { motion } from 'framer-motion';
import { RISK_COLORS } from '../../utils/formatters';

/**
 * TopSuspicious — ranked leaderboard of top-10 most suspicious providers
 * providers: provider list from store (already sorted by Fraud_Probability desc)
 */
export default function TopSuspicious({ providers = [], loading = false }) {
  const navigate = useNavigate();
  const top10 = providers.slice(0, 10);

  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-risk-vhigh" />
        <h3 className="section-title">Top 10 Suspicious Providers</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="shimmer h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {top10.map((p, i) => {
            const risk = getRiskLevel(p.Fraud_Probability);
            const pct = Math.min(p.Fraud_Probability * 100, 100);
            const color = RISK_COLORS[risk];

            return (
              <motion.button
                key={p.Provider}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/providers/${p.Provider}`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg
                           hover:bg-bg-elevated transition-all duration-150 text-left group"
              >
                {/* Rank */}
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center
                             text-xs font-bold shrink-0"
                  style={{
                    background: `${color}20`,
                    color,
                  }}
                >
                  {i + 1}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-text-primary truncate font-medium">
                      {p.Provider}
                    </span>
                    <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color }}>
                      {fmtProbability(p.Fraud_Probability)}
                    </span>
                  </div>
                  {/* Probability bar */}
                  <div className="mt-1 h-1 rounded-full bg-bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-text-dim opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              </motion.button>
            );
          })}

          {top10.length === 0 && (
            <div className="text-center py-8 text-text-dim text-sm">
              No providers available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
