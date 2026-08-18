import { useEffect, useRef, useState } from 'react';
import { easeOutQuart } from '../../utils/formatters';
import { motion } from 'framer-motion';

/**
 * KpiCard — animated count-up metric card
 *
 * Props:
 *   label     string
 *   value     number | string
 *   formatter (n) => string          — how to display the final value
 *   icon      ReactNode
 *   accent    boolean                — amber glow variant
 *   sublabel  string                 — small text below value
 *   trend     { direction: 'up'|'down', label: string }
 *   loading   boolean
 */
export default function KpiCard({
  label,
  value,
  formatter = (n) => n,
  icon,
  accent = false,
  sublabel,
  loading = false,
}) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);
  const isNumber = typeof value === 'number';

  useEffect(() => {
    if (!isNumber || loading) return;
    const start = performance.now();
    const duration = 900;
    const from = 0;
    const to = value;

    const tick = (now) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const progress = easeOutQuart(elapsed);
      setDisplayed(from + (to - from) * progress);
      if (elapsed < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, isNumber, loading]);

  if (loading) {
    return (
      <div className="card p-5 flex flex-col gap-3">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-8 w-32 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    );
  }

  const displayValue = isNumber ? formatter(displayed) : formatter(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`card p-5 flex flex-col gap-2 relative overflow-hidden transition-all duration-200
        hover:border-bg-border/80 hover:-translate-y-0.5
        ${accent ? 'border-accent-amber/30 shadow-glow' : ''}
      `}
    >
      {/* Background glow for accent cards */}
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent-amber/5 to-transparent pointer-events-none" />
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {icon && (
          <span className={`text-lg ${accent ? 'text-accent-amber' : 'text-text-dim'}`}>
            {icon}
          </span>
        )}
      </div>

      <div className={`text-2xl font-bold tabular-nums leading-none
        ${accent ? 'text-accent-amber' : 'text-text-primary'}`}
      >
        {displayValue}
      </div>

      {sublabel && (
        <div className="text-xs text-text-muted">{sublabel}</div>
      )}
    </motion.div>
  );
}
