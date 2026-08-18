import { motion } from 'framer-motion';
import { ShieldAlert, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * EmptyState — shown before any dataset has been analyzed
 */
export default function EmptyState({ message }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-[420px] p-12 text-center"
    >
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-bg-elevated border border-bg-border flex items-center justify-center">
          <ShieldAlert className="w-9 h-9 text-text-dim" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border border-dashed border-bg-border opacity-50" />
      </div>

      <h2 className="text-xl font-semibold text-text-primary mb-2">
        {message || 'No Analysis Available'}
      </h2>
      <p className="text-sm text-text-muted max-w-xs mb-6">
        Upload a dataset ZIP file containing Provider, Beneficiary, Inpatient, and Outpatient CSVs to get started.
      </p>

      <button
        onClick={() => navigate('/upload')}
        className="btn-primary"
      >
        <Upload className="w-4 h-4" />
        Upload Dataset
      </button>
    </motion.div>
  );
}

/**
 * ErrorState — API / analysis error display
 */
export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] p-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-risk-vhigh/10 border border-risk-vhigh/20 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7 text-risk-vhigh" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">Something went wrong</h3>
      <p className="text-sm text-text-muted mb-4 max-w-sm">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-sm">
          Try again
        </button>
      )}
    </div>
  );
}
