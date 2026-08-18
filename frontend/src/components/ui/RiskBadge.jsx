import { RISK_BG_CLASSES } from '../../utils/formatters';

/**
 * RiskBadge — coloured pill for risk level
 * level: 'Very High' | 'High' | 'Medium' | 'Low'
 */
export default function RiskBadge({ level, size = 'sm' }) {
  const classes = RISK_BG_CLASSES[level] || RISK_BG_CLASSES['Low'];
  const sizeCls = size === 'lg' ? 'px-3.5 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`risk-badge ${classes} ${sizeCls}`}>
      {level || 'Low'}
    </span>
  );
}

/**
 * PredictionBadge — Fraud / Not Fraud
 */
export function PredictionBadge({ prediction }) {
  const isFraud = prediction === 1 || prediction === 'Fraud';
  return (
    <span
      className={`risk-badge ${
        isFraud
          ? 'bg-risk-vhigh/20 text-risk-vhigh border border-risk-vhigh/30'
          : 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/30'
      }`}
    >
      {isFraud ? 'Fraud' : 'Legit'}
    </span>
  );
}
