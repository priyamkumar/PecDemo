'use client';

import React, { useState } from 'react';
import { FeedSubscription } from '@/types';
import { exportToOpml, parseOpml, ImportedOpmlFeed } from '@/lib/opml';
import { X, FileUp, Download, Upload, Check, AlertCircle } from 'lucide-react';

interface OpmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: FeedSubscription[];
  onImportFeeds: (feeds: ImportedOpmlFeed[]) => Promise<void>;
}

export default function OpmlModal({
  isOpen,
  onClose,
  subscriptions,
  onImportFeeds,
}: OpmlModalProps) {
  const [opmlText, setOpmlText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    const xml = exportToOpml(subscriptions);
    const blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `small-web-reader-subscriptions-${new Date().toISOString().slice(0, 10)}.opml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setOpmlText(content);
        processOpml(content);
      }
    };
    reader.readAsText(file);
  };

  const processOpml = async (text: string) => {
    if (!text.trim()) return;
    setIsImporting(true);
    setImportStatus(null);
    try {
      const feeds = parseOpml(text);
      if (feeds.length === 0) {
        throw new Error('No valid feed outlines found in the OPML file.');
      }
      await onImportFeeds(feeds);
      setImportStatus(`Successfully imported ${feeds.length} feeds!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setImportStatus(`Error: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                OPML Import & Export
              </h2>
              <p className="text-xs text-zinc-500">
                Export your feeds to open standards, or migrate from Feedly, NetNewsWire, Miniflux.
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
        <div className="p-6 space-y-6">
          {/* Export Section */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  Export Subscriptions
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Download an OPML 2.0 XML file containing all your {subscriptions.length} feeds & folders.
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={subscriptions.length === 0}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-zinc-950 font-semibold rounded-lg text-xs shadow-sm flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export OPML</span>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
              Import from OPML File
            </h4>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-amber-500/60 rounded-xl p-5 cursor-pointer bg-zinc-50/50 dark:bg-zinc-800/20 transition-colors">
              <Upload className="w-6 h-6 text-zinc-400 mb-1" />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Click to choose .opml or .xml file
              </span>
              <span className="text-[10px] text-zinc-400 mt-0.5">
                Feeds and folder structures will be preserved
              </span>
              <input
                type="file"
                accept=".opml,.xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {importStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-mono flex items-center space-x-2 ${
                  importStatus.startsWith('Success')
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                }`}
              >
                {importStatus.startsWith('Success') ? (
                  <Check className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{importStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
