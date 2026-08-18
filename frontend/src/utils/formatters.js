// ── Number formatters ───────────────────────────────────────────────────

export const fmtInt = (n) =>
  n == null ? '—' : Math.round(n).toLocaleString('en-US');

export const fmtDecimal = (n, decimals = 2) =>
  n == null ? '—' : Number(n).toFixed(decimals);

export const fmtPercent = (n, decimals = 1) =>
  n == null ? '—' : `${Number(n).toFixed(decimals)}%`;

export const fmtProbability = (n) =>
  n == null ? '—' : `${(Number(n) * 100).toFixed(1)}%`;

export const fmtCurrency = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

export const fmtLargeNumber = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return fmtInt(n);
};

// ── Date formatters ─────────────────────────────────────────────────────

export const fmtDate = (str) => {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return str;
  }
};

export const fmtMonthLabel = (str) => {
  if (!str) return '';
  // Handles "2009-01", "2009-01-01", etc.
  const d = new Date(str + '-01');
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// ── Risk colour helpers ─────────────────────────────────────────────────

export const RISK_COLORS = {
  'Very High': '#991b1b',
  'High': '#ea580c',
  'Medium': '#d97706',
  'Low': '#64748b',
};

export const RISK_BG_CLASSES = {
  'Very High': 'bg-risk-vhigh/20 text-risk-vhigh border border-risk-vhigh/30',
  'High': 'bg-risk-high/20 text-risk-high border border-risk-high/30',
  'Medium': 'bg-risk-medium/20 text-risk-medium border border-risk-medium/30',
  'Low': 'bg-risk-low/20 text-risk-low border border-risk-low/30',
};

// ── Animated counter helper ─────────────────────────────────────────────

/**
 * Linearly interpolates from 0 → end over `duration` ms.
 * Returns an array of values (integer steps) for use with requestAnimationFrame.
 */
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
