import { useEffect, useState } from 'react';
import { getProviders } from '../api/client';
import useAppStore from '../store/useAppStore';
import ProviderTable from '../components/providers/ProviderTable';
import TopSuspicious from '../components/providers/TopSuspicious';
import EmptyState from '../components/ui/EmptyState';

export default function ProvidersPage() {
  const { providers, setProviders, setHasAnalysis, hasAnalysis } = useAppStore();
  const [loading, setLoading] = useState(!providers.length);
  const [error, setError] = useState('');

  useEffect(() => {
    if (providers.length) { setLoading(false); return; }
    setLoading(true);
    getProviders()
      .then((data) => {
        setProviders(data.total_providers ?? data.total, data.providers ?? []);
        setHasAnalysis(true);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (!loading && (error?.includes('No provider') || (!providers.length && !loading))) {
    return (
      <div className="p-8">
        <EmptyState message="No provider data — analyze a dataset first" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Provider Explorer</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Browse, search, and filter all providers — click any row for a deep-dive
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5 items-start">
        {/* Main table */}
        <ProviderTable loading={loading} />

        {/* Sidebar leaderboard */}
        <div className="xl:sticky xl:top-6">
          <TopSuspicious providers={providers} loading={loading} />
        </div>
      </div>
    </div>
  );
}
