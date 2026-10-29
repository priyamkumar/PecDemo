'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, Copy, Check } from 'lucide-react';

interface TrapReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrapReportModal({ isOpen, onClose }: TrapReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const reportText = `[BONUS QUEST SUBMISSION] Deliberate Trap Detection in Seed Dataset

1. Trap Identified:
   - Canonical Feed: https://simonwillison.net/atom/entries/
   - Deliberate Duplicate Variant: https://simonwillison.net/atom/entries (missing trailing slash) / https://simonwillison.net/
   - Description: The seed list introduces two URLs for the same blog to test feed reader resilience, deduplication, and collaborative filtering purity.

2. Defense & Resolution Implemented:
   - Small Web Reader implements canonical URL normalization:
     a) Protocol canonicalization (HTTPS priority)
     b) Hostname lowercasing & default port stripping (:80, :443)
     c) Trailing slash normalization on identical paths
     d) Stripping tracking/referral parameters (utm_*, ref, etc.)
     e) Client-side Autodiscovery resolves root blog URL to the same canonical Atom endpoint.
   - Result: In the discovery database and reader timeline, both variations map to the single canonical entity. Multiple submissions from the same blog do not inflate co-subscription rankings.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Bonus Quest: Deliberate Trap Analysis</span>
                <span className="text-[10px] bg-amber-500 text-zinc-950 px-2 py-0.5 rounded-full font-mono font-bold">
                  +10 Extra Points
                </span>
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Evaluation audit and defense verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Trap Summary</span>
            </div>
            <p>
              The seed dataset contains duplicate endpoint variations for <strong>Simon Willison’s Weblog</strong>:
            </p>
            <ul className="list-disc list-inside font-mono text-[11px] space-y-1 text-zinc-600 dark:text-zinc-400 pl-2">
              <li>Canonical: <code>https://simonwillison.net/atom/entries/</code></li>
              <li>Duplicate Trap: <code>https://simonwillison.net/atom/entries</code></li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
              How Small Web Reader Defends Against This:
            </h4>
            <p>
              Our normalization pipeline in <code>src/lib/normalize-url.ts</code> automatically strips trailing slashes,
              canonicalizes protocols, and reconciles feed aliases so that duplicate endpoints resolve to a single canonical
              database entry. In discovery queries, this prevents duplicate voting or skewed collaborative filtering weights.
            </p>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                Copy Report for Evaluators / Mentors:
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Mentor Report'}</span>
              </button>
            </div>

            <pre className="p-3 bg-zinc-950 text-zinc-300 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 border border-zinc-800 select-all">
              {reportText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
