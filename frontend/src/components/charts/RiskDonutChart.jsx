import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { RISK_COLORS } from '../../utils/formatters';
import useAppStore from '../../store/useAppStore';

const RISK_ORDER = ['Very High', 'High', 'Medium', 'Low'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="custom-tooltip">
      <div className="label">{name}</div>
      <div>{value.toLocaleString()} providers</div>
    </div>
  );
};

/**
 * RiskDonutChart — provider risk distribution
 * data: { 'Very High': n, 'High': n, 'Medium': n, 'Low': n }
 */
export default function RiskDonutChart({ data, loading = false }) {
  const setRiskFilter = useAppStore((s) => s.setRiskFilter);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="shimmer h-4 w-36 rounded mb-4" />
        <div className="shimmer h-52 w-52 rounded-full mx-auto" />
      </div>
    );
  }

  const chartData = RISK_ORDER.map((level) => ({
    name: level,
    value: data?.[level] ?? 0,
    color: RISK_COLORS[level],
  })).filter((d) => d.value > 0);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="section-title">Risk Distribution</h3>
        <span className="text-xs text-text-muted">{total} providers</span>
      </div>
      <p className="text-xs text-text-muted mb-4">Click a segment to filter providers</p>

      {/* Chart — no Legend component */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onClick={(entry) => setRiskFilter(entry.name)}
              style={{ cursor: 'pointer' }}
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  stroke="transparent"
                  className="transition-opacity duration-150 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Manual legend — built from chartData, no Recharts payload */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3">
        {chartData.map((entry) => (
          <button
            key={entry.name}
            onClick={() => setRiskFilter(entry.name)}
            className="flex items-center gap-1.5 text-xs text-text-muted
                       hover:text-text-primary transition-colors"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: entry.color }}
            />
            {entry.name}
            <span className="text-text-dim">({entry.value})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
