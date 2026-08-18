import { Shield } from 'lucide-react';
import UploadDropzone from '../components/upload/UploadDropzone';
import { motion } from 'framer-motion';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Header bar */}
      <header className="border-b border-bg-border px-8 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-accent-amber flex items-center justify-center">
          <Shield className="w-4 h-4 text-bg-base" fill="currentColor" strokeWidth={0} />
        </div>
        <span className="text-sm font-bold text-text-primary">FraudLens</span>
        <span className="text-xs text-text-dim ml-1">Healthcare Provider Fraud Detection</span>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left — hero text */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col justify-center px-10 py-14 lg:px-16 lg:py-0 max-w-xl"
        >
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
            bg-accent-amber/10 border border-accent-amber/20 mb-6 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse-slow" />
            <span className="text-xs font-semibold text-accent-amber uppercase tracking-wider">
              CatBoost ML Model
            </span>
          </div>

          <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Detect Healthcare{' '}
            <span className="text-accent-amber">Provider Fraud</span>{' '}
            with AI
          </h1>
          <p className="text-text-muted leading-relaxed mb-8 text-base">
            Upload your Medicare claims dataset and our 62-feature CatBoost model
            will identify suspicious providers and flag fraudulent billing patterns in seconds.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Risk Scoring', desc: 'Per-provider fraud probability' },
              { label: 'Claim Analysis', desc: 'Inpatient & outpatient breakdown' },
              { label: 'XAI Insights', desc: 'Model explainability built-in' },
              { label: 'Batch Processing', desc: 'Thousands of providers at once' },
            ].map((f) => (
              <div key={f.label} className="p-3 rounded-xl bg-bg-elevated border border-bg-border">
                <div className="text-xs font-semibold text-text-primary mb-0.5">{f.label}</div>
                <div className="text-xs text-text-muted">{f.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — upload card */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 flex items-center justify-center px-8 py-10 bg-bg-surface border-l border-bg-border"
        >
          <div className="w-full max-w-md">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Upload Dataset</h2>
            <p className="text-sm text-text-muted mb-6">
              ZIP file containing Beneficiary, Inpatient, Outpatient CSVs
            </p>
            <UploadDropzone />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
