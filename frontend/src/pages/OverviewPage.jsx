import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, UserCheck, DollarSign, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getDashboard, getProviders } from '../api/client';
import useAppStore, { getRiskLevel } from '../store/useAppStore';
import KpiCard from '../components/ui/KpiCard';
import RiskDonutChart from '../components/charts/RiskDonutChart';
import ClaimSplitChart from '../components/charts/ClaimSplitChart';
import ClaimVolumeChart from '../components/charts/ClaimVolumeChart';
import EmptyState from '../components/ui/EmptyState';
import { fmtLargeNumber, fmtCurrency, fmtPercent } from '../utils/formatters';
import { motion } from 'framer-motion';

/** Build risk distribution from providers list */
function buildRiskDist(providers) {
  const dist = { 'Very High': 0, 'High': 0, 'Medium': 0, 'Low': 0 };
  providers.forEach((p) => {
    const level = getRiskLevel(p.Fraud_Probability);
    dist[level] = (dist[level] || 0) + 1;
  });
  return dist;
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const { dashboard, setDashboard, setProviders, setHasAnalysis, providers, hasAnalysis } = useAppStore();
  const [loading, setLoading] = useState(!dashboard);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [dash, prov] = await Promise.all([getDashboard(), getProviders()]);
        setDashboard(dash);
        setProviders(prov.total_providers ?? prov.total, prov.providers ?? []);
        setHasAnalysis(true);
      } catch (err) {
        setError(err.message);
        if (err.message.includes('No analysis')) {
          setHasAnalysis(false);
        }
      } finally {
        setLoading(false);
      }
    }
    // If no dashboard yet, always fetch
    if (!dashboard) load();
    else {
      // Refresh providers in background if not loaded
      if (!providers.length) {
        getProviders()
          .then((p) => setProviders(p.total_providers ?? p.total, p.providers ?? []))
          .catch(() => {});
      }
      setLoading(false);
    }
  }, []);

  if (!loading && !dashboard && !error) {
    return <EmptyState />;
  }

  if (!loading && error && error.includes('No analysis')) {
    return (
      <div className="p-8">
        <EmptyState message="No dataset analyzed yet" />
      </div>
    );
  }

  const riskDist = buildRiskDist(providers);
  const highRiskCount = (riskDist['Very High'] || 0) + (riskDist['High'] || 0);

  const d = dashboard || {};

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Fraud Overview</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Dataset analysis complete — review the fraud indicators below
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="btn-ghost text-xs"
        >
          Upload new dataset
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Total Providers"
          value={d.total_providers}
          formatter={fmtLargeNumber}
          icon={<Users className="w-4 h-4" />}
          loading={loading}
        />
        <KpiCard
          label="Total Claims"
          value={d.total_claims}
          formatter={fmtLargeNumber}
          icon={<FileText className="w-4 h-4" />}
          loading={loading}
        />
        <KpiCard
          label="Beneficiaries"
          value={d.total_beneficiaries}
          formatter={fmtLargeNumber}
          icon={<UserCheck className="w-4 h-4" />}
          loading={loading}
        />
        <KpiCard
          label="Fraud Providers"
          value={d.fraud_providers}
          formatter={fmtLargeNumber}
          icon={<ShieldAlert className="w-4 h-4" />}
          accent
          loading={loading}
        />
        <KpiCard
          label="Fraud %"
          value={d.fraud_provider_percentage}
          formatter={(n) => fmtPercent(n)}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent
          loading={loading}
        />
        <KpiCard
          label="High-Risk Count"
          value={highRiskCount}
          formatter={fmtLargeNumber}
          icon={<AlertTriangle className="w-4 h-4" />}
          sublabel="Very High + High"
          loading={loading}
        />
      </div>

      {/* Charts Row 1: Donuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RiskDonutChart data={riskDist} loading={loading} />
        <ClaimSplitChart
          fraudClaims={d.fraud_claims}
          normalClaims={d.normal_claims}
          loading={loading}
        />
      </div>

      {/* Charts Row 2: Inpatient vs Outpatient */}
      <ClaimVolumeChart
        inpatientClaims={d.inpatient_claims}
        outpatientClaims={d.outpatient_claims}
        loading={loading}
      />

      {/* Summary stats footer */}
      {!loading && d.total_claims && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: 'Fraudulent Claims', value: fmtLargeNumber(d.fraud_claims), color: 'text-risk-vhigh' },
            { label: 'Normal Claims', value: fmtLargeNumber(d.normal_claims), color: 'text-emerald-400' },
            { label: 'Claim Fraud Rate', value: fmtPercent(d.fraud_claim_percentage), color: 'text-risk-high' },
            { label: 'Legit Providers', value: fmtLargeNumber(d.normal_providers), color: 'text-text-primary' },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="text-xs text-text-muted mb-1">{s.label}</div>
              <div className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
