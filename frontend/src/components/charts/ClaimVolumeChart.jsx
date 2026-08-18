import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { fmtInt } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
          {p.name}: <span className="font-semibold text-text-primary">{fmtInt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * ClaimVolumeChart — Inpatient vs Outpatient bar comparison
 */
export default function ClaimVolumeChart({
  inpatientClaims = 0,
  outpatientClaims = 0,
  loading = false,
}) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="shimmer h-4 w-40 rounded mb-4" />
        <div className="shimmer h-48 rounded" />
      </div>
    );
  }

  const data = [
    { name: 'Claim Volume', Inpatient: inpatientClaims, Outpatient: outpatientClaims },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Inpatient vs Outpatient Claims</h3>
        <div className="flex gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent-amber inline-block" />
            Inpatient
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
            Outpatient
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#8b949e', fontSize: 11 }}
            tickFormatter={fmtInt}
            axisLine={false}
            tickLine={false}
          />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="Inpatient" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={36} />
          <Bar dataKey="Outpatient" fill="#2563eb" radius={[0, 4, 4, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>

      {/* Stats row */}
      <div className="flex gap-6 mt-3 pt-3 border-t border-bg-border">
        <div>
          <div className="text-xs text-text-muted">Inpatient</div>
          <div className="text-lg font-semibold text-accent-amber tabular-nums">
            {fmtInt(inpatientClaims)}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted">Outpatient</div>
          <div className="text-lg font-semibold text-blue-400 tabular-nums">
            {fmtInt(outpatientClaims)}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted">Total</div>
          <div className="text-lg font-semibold text-text-primary tabular-nums">
            {fmtInt(inpatientClaims + outpatientClaims)}
          </div>
        </div>
      </div>
    </div>
  );
}
