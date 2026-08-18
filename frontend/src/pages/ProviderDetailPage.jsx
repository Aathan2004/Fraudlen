import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Info, Activity,
} from 'lucide-react';
import { getProvider } from '../api/client';
import { getRiskLevel } from '../store/useAppStore';
import RiskBadge, { PredictionBadge } from '../components/ui/RiskBadge';
import MonthlyClaimsChart from '../components/charts/MonthlyClaimsChart';
import MonthlyReimbursementChart from '../components/charts/MonthlyReimbursementChart';
import { SkeletonChart } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/EmptyState';
import {
  fmtInt, fmtPercent, fmtCurrency, fmtProbability, fmtDate, RISK_COLORS,
} from '../utils/formatters';
import { motion } from 'framer-motion';

// ── Risk Gauge ───────────────────────────────────────────────────────────────

function RiskGauge({ probability }) {
  const pct = Math.min(Math.max(probability * 100, 0), 100);
  const risk = getRiskLevel(probability);
  const color = RISK_COLORS[risk];
  const r = 54;
  const circ = 2 * Math.PI * r;
  // Half-circle (180 deg sweep) for gauge
  const arcLength = circ * 0.65;
  const dashOffset = arcLength * (1 - pct / 100);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="100" viewBox="0 0 140 100">
        {/* Track */}
        <path
          d="M 15 95 A 55 55 0 0 1 125 95"
          fill="none" stroke="#30363d" strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d="M 15 95 A 55 55 0 0 1 125 95"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arcLength}`}
          strokeDashoffset={`${arcLength * (1 - pct / 100)}`}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.5s' }}
          className="gauge-ring"
        />
      </svg>
      <div className="absolute bottom-1 text-center">
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>
          {pct.toFixed(1)}%
        </div>
        <div className="text-[10px] text-text-muted uppercase tracking-wider">Risk Score</div>
      </div>
    </div>
  );
}

// ── Monthly data builder (from claims list) ──────────────────────────────────

function buildMonthlyData(claims) {
  const monthMap = {};
  claims.forEach((c) => {
    const dt = c.ClaimStartDt || c.AdmissionDt || c.ServiceDate || '';
    if (!dt) return;
    const month = String(dt).slice(0, 7); // "YYYY-MM"
    if (!month) return;
    if (!monthMap[month]) monthMap[month] = { month, claims: 0, reimbursement: 0 };
    monthMap[month].claims += 1;
    monthMap[month].reimbursement += Number(c.InscClaimAmtReimbursed || c.IPAnnualReimbursementAmt || 0);
  });
  return Object.values(monthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ Month: m.month, Claims: m.claims, Reimbursement: m.reimbursement }));
}

// ── Why Flagged explainer ────────────────────────────────────────────────────

function buildExplanationReasons(providerData) {
  const {
    fraud_probability, fraud_claims, claim_count,
    fraud_claim_percentage, xai,
  } = providerData;

  const reasons = [];

  if (fraud_probability >= 0.75)
    reasons.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      severity: 'high',
      text: `Extremely high fraud probability of ${fmtProbability(fraud_probability)} — well above the 40% decision threshold.`,
    });
  else if (fraud_probability >= 0.55)
    reasons.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      severity: 'medium',
      text: `Elevated fraud probability of ${fmtProbability(fraud_probability)}, indicating the model is flagging significant suspicious patterns.`,
    });

  if (fraud_claim_percentage >= 70)
    reasons.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      severity: 'high',
      text: `${fmtPercent(fraud_claim_percentage)} of all claims are flagged as fraudulent — an unusually high fraudulent claim ratio.`,
    });
  else if (fraud_claim_percentage >= 40)
    reasons.push({
      icon: <Info className="w-4 h-4" />,
      severity: 'medium',
      text: `${fmtPercent(fraud_claim_percentage)} of claims are suspicious, indicating a systematic billing anomaly.`,
    });

  if (claim_count >= 500)
    reasons.push({
      icon: <Activity className="w-4 h-4" />,
      severity: 'medium',
      text: `High claim volume of ${fmtInt(claim_count)} claims — disproportionately high activity may indicate upcoding or phantom billing.`,
    });

  // XAI-derived reasons
  if (xai?.top_features?.length) {
    const top = xai.top_features.slice(0, 3);
    reasons.push({
      icon: <Info className="w-4 h-4" />,
      severity: 'info',
      text: `Key model features driving this score: ${top.map((f) => f.feature || f.name || f).join(', ')}.`,
    });
  }

  if (reasons.length === 0 && fraud_probability >= 0.4)
    reasons.push({
      icon: <Info className="w-4 h-4" />,
      severity: 'info',
      text: 'Multiple statistical anomalies across claim patterns, diagnosis codes, and reimbursement rates triggered this alert.',
    });

  return reasons;
}

// ── Claim Row ────────────────────────────────────────────────────────────────

function ClaimRow({ claim, variant }) {
  const isSuspicious = variant === 'suspicious';
  return (
    <tr className={`transition-colors ${isSuspicious ? 'hover:bg-risk-vhigh/5' : 'hover:bg-bg-elevated'}`}>
      <td className="px-3 py-2 text-xs font-mono text-text-muted">{claim.ClaimID || '—'}</td>
      <td className="px-3 py-2 text-xs">{fmtDate(claim.ClaimStartDt || claim.AdmissionDt || claim.ServiceDate)}</td>
      <td className="px-3 py-2 text-xs tabular-nums">
        {fmtCurrency(claim.InscClaimAmtReimbursed || claim.IPAnnualReimbursementAmt || 0)}
      </td>
      <td className="px-3 py-2 text-xs tabular-nums">
        <span
          className={`font-semibold ${
            isSuspicious ? 'text-risk-high' : 'text-text-secondary'
          }`}
        >
          {fmtProbability(claim.Fraud_Probability)}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-text-muted truncate max-w-[120px]">
        {claim.ClmDiagnosisCode_1 || claim.ICD9_DGNS_CD_1 || '—'}
      </td>
    </tr>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ProviderDetailPage() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getProvider(providerId)
      .then((res) => { setData(res); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [providerId]);

  const allClaims = data?.claims ?? [];

  // Monthly data computed from claims
  const monthlyData = useMemo(() => buildMonthlyData(allClaims), [allClaims]);
  // Split suspicious vs normal from claims list
  const suspiciousClaims = allClaims.filter((c) => c.Fraud_Prediction === 1).slice(0, 20);
  const normalClaims = allClaims.filter((c) => c.Fraud_Prediction !== 1).slice(0, 20);

  const risk = data ? getRiskLevel(data.fraud_probability) : 'Low';
  const riskColor = RISK_COLORS[risk];

  const explanationReasons = data ? buildExplanationReasons(data) : [];

  if (error) {
    return (
      <div className="p-8">
        <button onClick={() => navigate(-1)} className="btn-ghost mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="btn-ghost text-sm -ml-1">
        <ArrowLeft className="w-4 h-4" /> Provider Explorer
      </button>

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="card p-6">
        {loading ? (
          <div className="flex gap-6 items-center">
            <div className="shimmer w-36 h-24 rounded-xl" />
            <div className="space-y-3 flex-1">
              <div className="shimmer h-6 w-48 rounded" />
              <div className="shimmer h-4 w-32 rounded" />
              <div className="shimmer h-4 w-24 rounded" />
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-6 items-start"
          >
            {/* Gauge */}
            <RiskGauge probability={data?.fraud_probability ?? 0} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-xl font-bold font-mono text-text-primary">{data?.provider}</h1>
                <RiskBadge level={risk} size="lg" />
                <PredictionBadge prediction={data?.fraud_prediction} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {[
                  { label: 'Total Claims', value: fmtInt(data?.claim_count) },
                  { label: 'Fraud Claims', value: fmtInt(data?.fraud_claims), color: 'text-risk-vhigh' },
                  { label: 'Normal Claims', value: fmtInt(data?.normal_claims), color: 'text-emerald-400' },
                  { label: 'Fraud Claim %', value: fmtPercent(data?.fraud_claim_percentage), color: 'text-risk-high' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-xs text-text-muted">{s.label}</div>
                    <div className={`text-lg font-bold tabular-nums ${s.color || 'text-text-primary'}`}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Suspicious claim bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>Suspicious claim ratio</span>
                  <span>{fmtPercent(data?.fraud_claim_percentage)}</span>
                </div>
                <div className="h-2 rounded-full bg-bg-border overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(data?.fraud_claim_percentage ?? 0, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: riskColor }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Monthly Charts ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <>
            <SkeletonChart height={200} />
            <SkeletonChart height={200} />
          </>
        ) : (
          <>
            <MonthlyClaimsChart data={monthlyData} />
            <MonthlyReimbursementChart data={monthlyData} />
          </>
        )}
      </div>

      {/* ── Why Flagged Panel ────────────────────────────────────── */}
      {!loading && explanationReasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-risk-vhigh/20 border border-risk-vhigh/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-risk-vhigh" />
            </div>
            <h3 className="section-title">Why This Provider Is Flagged</h3>
          </div>
          <div className="space-y-2.5">
            {explanationReasons.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border
                  ${r.severity === 'high'
                    ? 'bg-risk-vhigh/10 border-risk-vhigh/20 text-risk-vhigh'
                    : r.severity === 'medium'
                    ? 'bg-risk-high/10 border-risk-high/20 text-risk-high'
                    : 'bg-bg-elevated border-bg-border text-text-muted'
                  }`}
              >
                <span className="shrink-0 mt-0.5">{r.icon}</span>
                <span className="text-sm leading-relaxed">{r.text}</span>
              </div>
            ))}
          </div>

          {/* XAI feature importance */}
          {data?.xai?.top_features?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-bg-border">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Top Model Features (SHAP)
              </p>
              <div className="space-y-2">
                {data.xai.top_features.slice(0, 8).map((f, i) => {
                  const name = f.feature || f.name || `Feature ${i}`;
                  const val = Math.abs(f.importance || f.value || 0);
                  const maxVal = Math.abs(data.xai.top_features[0]?.importance || data.xai.top_features[0]?.value || 1);
                  const width = maxVal ? (val / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted font-mono w-52 truncate">{name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-amber/70 transition-all duration-700"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-dim w-12 text-right tabular-nums">
                        {(val).toFixed(4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Claims Tables ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Suspicious */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-bg-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-risk-vhigh" />
            <span className="text-sm font-semibold text-text-primary">
              Unusual Claims
            </span>
            <span className="ml-auto text-xs text-text-dim">
              top {suspiciousClaims.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-base">
                  {['Claim ID', 'Date', 'Reimb.', 'Fraud Prob', 'Diag Code'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold
                      uppercase tracking-wider text-text-dim border-b border-bg-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-3 py-2">
                          <div className="shimmer h-3 rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : suspiciousClaims.length
                  ? suspiciousClaims.map((c, i) => (
                    <ClaimRow key={i} claim={c} variant="suspicious" />
                  ))
                  : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-text-dim">
                        No suspicious claims
                      </td>
                    </tr>
                  )
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Normal */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-bg-border flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-text-primary">
              Normal Claims
            </span>
            <span className="ml-auto text-xs text-text-dim">
              top {normalClaims.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-base">
                  {['Claim ID', 'Date', 'Reimb.', 'Fraud Prob', 'Diag Code'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold
                      uppercase tracking-wider text-text-dim border-b border-bg-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-3 py-2">
                          <div className="shimmer h-3 rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : normalClaims.length
                  ? normalClaims.map((c, i) => (
                    <ClaimRow key={i} claim={c} variant="normal" />
                  ))
                  : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-text-dim">
                        No normal claims in top 20
                      </td>
                    </tr>
                  )
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
