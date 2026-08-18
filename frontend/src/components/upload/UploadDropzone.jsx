import { useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileArchive, AlertCircle, CheckCircle2, Loader2,
  FileSpreadsheet, X, ChevronRight,
} from 'lucide-react';
import JSZip from 'jszip';
import { analyzeZip } from '../../api/client';
import useAppStore from '../../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';

// ── Error message mapping ─────────────────────────────────────────────────

const ERROR_MESSAGES = {
  'not a valid zip': 'The file you uploaded is not a valid ZIP archive.',
  'no csv files': 'No CSV files were found inside the ZIP.',
  'could not identify': 'Could not locate required datasets (Beneficiary, Inpatient, Outpatient) inside the ZIP.',
  'model': 'The ML model is not loaded on the server. Please restart the backend.',
};

function friendlyError(raw) {
  const lower = raw?.toLowerCase() || '';
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (lower.includes(key)) return msg;
  }
  return raw || 'An unexpected error occurred.';
}

// ── CSV file slot config ───────────────────────────────────────────────────

const CSV_SLOTS = [
  {
    id: 'beneficiary',
    label: 'Beneficiary Data',
    desc: 'BeneID, DOB, Gender, Race…',
    required: true,
  },
  {
    id: 'inpatient',
    label: 'Inpatient Claims',
    desc: 'AdmissionDt, DischargeDt, Provider…',
    required: true,
  },
  {
    id: 'outpatient',
    label: 'Outpatient Claims',
    desc: 'ClmDiagnosisCode_1, Provider…',
    required: true,
  },
  {
    id: 'provider',
    label: 'Provider Labels',
    desc: 'Provider, PotentialFraud (optional)',
    required: false,
  },
];

// ── Single CSV file slot ──────────────────────────────────────────────────

function CsvSlot({ slot, file, onFile, onClear }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith('.csv')) onFile(slot.id, f);
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !file && inputRef.current?.click()}
      className={`relative rounded-xl border transition-all duration-200 p-3.5 flex items-center gap-3
        ${file
          ? 'border-accent-amber/40 bg-accent-amber/5 cursor-default'
          : isDragging
          ? 'border-accent-amber bg-accent-amber/10 cursor-pointer'
          : 'border-bg-border hover:border-text-dim bg-bg-elevated cursor-pointer'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(slot.id, f);
          e.target.value = '';
        }}
      />

      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
        ${file ? 'bg-accent-amber/20' : 'bg-bg-border'}`}>
        <FileSpreadsheet className={`w-4.5 h-4.5 ${file ? 'text-accent-amber' : 'text-text-dim'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-text-primary">{slot.label}</span>
          {!slot.required && (
            <span className="text-[10px] text-text-dim border border-bg-border rounded px-1">optional</span>
          )}
        </div>
        {file ? (
          <div className="text-xs text-accent-amber truncate mt-0.5">{file.name}</div>
        ) : (
          <div className="text-xs text-text-dim truncate mt-0.5">{slot.desc}</div>
        )}
      </div>

      {file ? (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(slot.id); }}
          className="text-text-dim hover:text-risk-vhigh transition-colors shrink-0"
          title="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-text-dim shrink-0" />
      )}
    </div>
  );
}

// ── Main Dropzone Component ───────────────────────────────────────────────

export default function UploadDropzone() {
  const navigate = useNavigate();
  const { setDashboard, setHasAnalysis, reset } = useAppStore();

  // Mode: 'zip' | 'csv'
  const [mode, setMode] = useState('zip');

  // ZIP mode state
  const [zipFile, setZipFile] = useState(null);
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  const zipInputRef = useRef(null);

  // CSV mode state
  const [csvFiles, setCsvFiles] = useState({
    beneficiary: null,
    inpatient: null,
    outpatient: null,
    provider: null,
  });

  // Shared state
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // ── ZIP handlers ──────────────────────────────────────────────

  const handleZipFile = useCallback((f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a .zip file.');
      setStatus('error');
      return;
    }
    setZipFile(f);
    setStatus('idle');
    setError('');
  }, []);

  const onZipDrop = (e) => {
    e.preventDefault();
    setIsDraggingZip(false);
    handleZipFile(e.dataTransfer.files?.[0]);
  };

  // ── CSV handlers ──────────────────────────────────────────────

  const handleCsvFile = useCallback((slotId, file) => {
    setCsvFiles((prev) => ({ ...prev, [slotId]: file }));
    setStatus('idle');
    setError('');
  }, []);

  const clearCsvFile = useCallback((slotId) => {
    setCsvFiles((prev) => ({ ...prev, [slotId]: null }));
  }, []);

  const requiredCsvsFilled = CSV_SLOTS.filter((s) => s.required)
    .every((s) => csvFiles[s.id] != null);

  // ── Build ZIP from 4 CSVs (client-side) ──────────────────────

  const buildZipFromCsvs = async () => {
    const zip = new JSZip();
    for (const slot of CSV_SLOTS) {
      if (csvFiles[slot.id]) {
        zip.file(`${slot.id}.csv`, csvFiles[slot.id]);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    return new File([blob], 'dataset.zip', { type: 'application/zip' });
  };

  // ── Submit ────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    reset();
    setStatus('uploading');
    setProgress(0);
    setError('');

    try {
      let fileToUpload;

      if (mode === 'zip') {
        fileToUpload = zipFile;
      } else {
        // Pack CSVs into a ZIP in the browser
        setProgress(5);
        fileToUpload = await buildZipFromCsvs();
        setProgress(15);
      }

      const data = await analyzeZip(fileToUpload, (pct) => {
        // Scale upload progress: 15-100% when in CSV mode, 0-100% in ZIP mode
        setProgress(mode === 'csv' ? 15 + Math.round(pct * 0.85) : pct);
      });

      setDashboard(data);
      setHasAnalysis(true);
      setStatus('success');
      setTimeout(() => navigate('/overview'), 800);
    } catch (err) {
      setStatus('error');
      setError(friendlyError(err.message));
    }
  };

  const canSubmit =
    status !== 'uploading' &&
    status !== 'success' &&
    (mode === 'zip' ? !!zipFile : requiredCsvsFilled);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Mode tabs */}
      <div className="flex rounded-lg bg-bg-elevated border border-bg-border p-1 mb-5">
        {[
          { id: 'zip', label: '1 ZIP File', icon: FileArchive },
          { id: 'csv', label: '4 CSV Files', icon: FileSpreadsheet },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setStatus('idle'); setError(''); }}
            disabled={status === 'uploading'}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md
              text-sm font-medium transition-all duration-200
              ${mode === id
                ? 'bg-accent-amber text-bg-base shadow-sm'
                : 'text-text-muted hover:text-text-primary'
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── ZIP upload mode ─────────────────────────────── */}
        {mode === 'zip' && (
          <motion.div
            key="zip"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div
              onDrop={onZipDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingZip(true); }}
              onDragLeave={() => setIsDraggingZip(false)}
              onClick={() => status !== 'uploading' && zipInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                transition-all duration-300 select-none
                ${isDraggingZip
                  ? 'dropzone-active border-accent-amber'
                  : 'border-bg-border hover:border-text-dim hover:bg-bg-elevated/30'
                }
                ${status === 'uploading' ? 'pointer-events-none opacity-70' : ''}
              `}
            >
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                onChange={(e) => handleZipFile(e.target.files?.[0])}
                className="hidden"
              />

              <AnimatePresence mode="wait">
                {status === 'uploading' ? (
                  <UploadingState progress={progress} filename={zipFile?.name || 'dataset.zip'} />
                ) : status === 'success' ? (
                  <SuccessState />
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center
                      transition-all duration-300
                      ${zipFile ? 'border-accent-amber/50 bg-accent-amber/10' : 'border-bg-border bg-bg-elevated'}`}>
                      {zipFile
                        ? <FileArchive className="w-6 h-6 text-accent-amber" />
                        : <Upload className="w-6 h-6 text-text-dim" />}
                    </div>
                    {zipFile ? (
                      <div>
                        <div className="text-sm font-medium text-text-primary">{zipFile.name}</div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {(zipFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-text-primary">Drop ZIP file here</div>
                        <div className="text-xs text-text-muted mt-1">or click to browse · .zip files only</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── CSV upload mode ─────────────────────────────── */}
        {mode === 'csv' && (
          <motion.div
            key="csv"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2.5"
          >
            {status === 'uploading' ? (
              <div className="border-2 border-dashed border-bg-border rounded-2xl p-8">
                <UploadingState progress={progress} filename="dataset.zip (building…)" />
              </div>
            ) : status === 'success' ? (
              <div className="border-2 border-dashed border-bg-border rounded-2xl p-8">
                <SuccessState />
              </div>
            ) : (
              <>
                {CSV_SLOTS.map((slot) => (
                  <CsvSlot
                    key={slot.id}
                    slot={slot}
                    file={csvFiles[slot.id]}
                    onFile={handleCsvFile}
                    onClear={clearCsvFile}
                  />
                ))}
                {!requiredCsvsFilled && (
                  <p className="text-xs text-text-dim pl-1">
                    Add the 3 required files to enable analysis.
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {status === 'error' && error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 mt-4 p-3.5 rounded-xl
                       bg-risk-vhigh/10 border border-risk-vhigh/20"
          >
            <AlertCircle className="w-4 h-4 text-risk-vhigh shrink-0 mt-0.5" />
            <p className="text-xs text-risk-vhigh leading-relaxed">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze button */}
      <AnimatePresence>
        {canSubmit && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <button
              onClick={handleAnalyze}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              Analyze Dataset
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint box */}
      {status === 'idle' || status === 'error' ? (
        <div className="mt-5 p-4 rounded-xl bg-bg-elevated border border-bg-border">
          <p className="text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-2">
            {mode === 'zip' ? 'Expected ZIP contents' : 'Required CSV files'}
          </p>
          <ul className="space-y-1">
            {mode === 'zip' ? (
              [
                'Beneficiary data (BeneID, DOB, Gender, Race…)',
                'Inpatient claims (AdmissionDt, DischargeDt…)',
                'Outpatient claims (ClmDiagnosisCode_1…)',
                'Provider labels (optional)',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="w-1 h-1 rounded-full bg-accent-amber/60 shrink-0" />
                  {item}
                </li>
              ))
            ) : (
              CSV_SLOTS.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs text-text-muted">
                  <span className={`w-1 h-1 rounded-full shrink-0 ${
                    csvFiles[s.id] ? 'bg-emerald-400' : s.required ? 'bg-accent-amber/60' : 'bg-bg-border'
                  }`} />
                  <span className={csvFiles[s.id] ? 'text-emerald-400' : ''}>
                    {s.label}{s.required ? '' : ' (optional)'}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────

function UploadingState({ progress, filename }) {
  return (
    <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-4">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#30363d" strokeWidth="4" />
          <circle
            cx="28" cy="28" r="24" fill="none"
            stroke="#f59e0b" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-accent-amber">
          {progress}%
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-text-primary">
          {progress < 100 ? 'Uploading…' : 'Analyzing dataset…'}
        </div>
        <div className="text-xs text-text-muted mt-0.5">{filename}</div>
      </div>
      <Loader2 className="w-4 h-4 text-accent-amber animate-spin" />
    </motion.div>
  );
}

function SuccessState() {
  return (
    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-3">
      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      <div className="text-sm font-medium text-emerald-400">Analysis complete!</div>
      <div className="text-xs text-text-muted">Redirecting to dashboard…</div>
    </motion.div>
  );
}
