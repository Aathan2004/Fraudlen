import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fmtMonthLabel } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{fmtMonthLabel(label)}</div>
      <div className="text-accent-amber font-semibold">{payload[0].value} claims</div>
    </div>
  );
};

/**
 * MonthlyClaimsChart
 * data: [{ Month: 'YYYY-MM', Claims: n }, ...]
 */
export default function MonthlyClaimsChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="shimmer h-4 w-40 rounded mb-4" />
        <div className="shimmer h-48 rounded" />
      </div>
    );
  }

  const chartData = [...data].sort((a, b) =>
    String(a.Month).localeCompare(String(b.Month))
  );

  return (
    <div className="card p-5">
      <h3 className="section-title mb-4">Monthly Claims</h3>

      {!chartData.length ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">
          No monthly data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="claimsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
            <XAxis
              dataKey="Month"
              tick={{ fill: '#8b949e', fontSize: 11 }}
              tickFormatter={fmtMonthLabel}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#8b949e', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Claims"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#claimsGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b', stroke: '#0d1117', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
