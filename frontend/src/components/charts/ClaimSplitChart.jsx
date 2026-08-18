import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  fraud: '#991b1b',
  normal: '#1e3a5f',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  const total = p.total;
  const pct = total ? ((value / total) * 100).toFixed(1) : 0;
  return (
    <div className="custom-tooltip">
      <div className="label">{name}</div>
      <div>{value.toLocaleString()} claims ({pct}%)</div>
    </div>
  );
};

/**
 * ClaimSplitChart — Fraud vs Normal claims donut
 * fraudClaims: number
 * normalClaims: number
 */
export default function ClaimSplitChart({ fraudClaims = 0, normalClaims = 0, loading = false }) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="shimmer h-4 w-36 rounded mb-4" />
        <div className="shimmer h-52 w-52 rounded-full mx-auto" />
      </div>
    );
  }

  const total = fraudClaims + normalClaims;
  const fraudPct = total ? ((fraudClaims / total) * 100).toFixed(1) : 0;

  const data = [
    { name: 'Fraudulent', value: fraudClaims, total },
    { name: 'Normal', value: normalClaims, total },
  ];

  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="section-title">Claim Breakdown</h3>
        <span className="text-xs text-risk-vhigh font-semibold">{fraudPct}% fraudulent</span>
      </div>
      <p className="text-xs text-text-muted mb-4">Fraudulent vs normal claim split</p>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              animationBegin={100}
              animationDuration={800}
            >
              <Cell fill={COLORS.fraud} stroke="transparent" />
              <Cell fill={COLORS.normal} stroke="transparent" />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Manual clean legend */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: COLORS.fraud }}
          />
          Fraudulent
          <span className="text-text-dim">({fraudClaims.toLocaleString()})</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: COLORS.normal }}
          />
          Normal
          <span className="text-text-dim">({normalClaims.toLocaleString()})</span>
        </div>
      </div>
    </div>
  );
}
