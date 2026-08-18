import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { fmtMonthLabel, fmtCurrency } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{fmtMonthLabel(label)}</div>
      <div className="text-blue-400 font-semibold">{fmtCurrency(payload[0].value)}</div>
    </div>
  );
};

/**
 * MonthlyReimbursementChart
 * data: [{ Month: 'YYYY-MM', Reimbursement: n }, ...]
 */
export default function MonthlyReimbursementChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="shimmer h-4 w-48 rounded mb-4" />
        <div className="shimmer h-48 rounded" />
      </div>
    );
  }

  const chartData = [...data].sort((a, b) =>
    String(a.Month).localeCompare(String(b.Month))
  );

  const maxVal = Math.max(...chartData.map((d) => d.Reimbursement || 0), 1);

  return (
    <div className="card p-5">
      <h3 className="section-title mb-4">Monthly Reimbursement</h3>

      {!chartData.length ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">
          No reimbursement data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
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
              tickFormatter={fmtCurrency}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="Reimbursement" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={`rgba(37, 99, 235, ${0.4 + (entry.Reimbursement / maxVal) * 0.6})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
