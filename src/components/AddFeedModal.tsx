'use client';

import React, { useState } from 'react';
import { autodiscoverFeed } from '@/lib/autodiscovery';
import { normalizeUrl } from '@/lib/normalize-url';
import { SEED_BLOGS, SeedBlog } from '@/lib/seed-data';
import { 
  X, 
  Plus, 
  Search, 
  RotateCw, 
  Check, 
  AlertTriangle, 
  FolderPlus, 
  Globe,
  Sparkles
} from 'lucide-react';

interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFeed: (feedUrl: string, title?: string, siteUrl?: string, folder?: string) => Promise<void>;
  subscribedUrls: Set<string>;
}

export default function AddFeedModal({
  isOpen,
  onClose,
  onAddFeed,
  subscribedUrls,
}: AddFeedModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [folderInput, setFolderInput] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredInfo, setDiscoveredInfo] = useState<{ feedUrl: string; title: string; siteUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trapWarning, setTrapWarning] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleDiscover = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setIsDiscovering(true);
    setError(null);
    setTrapWarning(null);
    setDiscoveredInfo(null);

    const norm = normalizeUrl(urlInput.trim());

    // Check if this matches the deliberate seed trap
    const trapBlog = SEED_BLOGS.find(b => b.isTrap && normalizeUrl(b.url) === norm);
    if (trapBlog) {
      setTrapWarning(`Trap Detected: ${trapBlog.trapReason}`);
    }

    try {
      const discovered = await autodiscoverFeed(norm);
      setDiscoveredInfo(discovered);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Feed discovery failed';
      setError(msg);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConfirmAdd = async () => {
    const feedUrl = discoveredInfo?.feedUrl || urlInput.trim();
    if (!feedUrl) return;

    setIsAdding(true);
    try {
      await onAddFeed(
        feedUrl,
        discoveredInfo?.title,
        discoveredInfo?.siteUrl,
        folderInput.trim() || undefined
      );
      // Reset & close
      setUrlInput('');
      setFolderInput('');
      setDiscoveredInfo(null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add feed';
      setError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickAddSeed = async (blog: SeedBlog) => {
    await onAddFeed(blog.url, blog.title, blog.siteUrl, blog.tags[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Subscribe to Independent Blog
              </h2>
              <p className="text-xs text-zinc-500">
                Enter any blog or feed URL. We will autodiscover its RSS or Atom feed.
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* URL Input Form */}
          <form onSubmit={handleDiscover} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Website or Feed URL
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="e.g. danluu.com or https://jvns.ca/atom.xml"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isDiscovering || !urlInput.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 font-semibold rounded-lg text-xs shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {isDiscovering ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Autodiscover</span>
                </button>
              </div>
            </div>

            {/* Optional Folder / Tag */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Folder / Tag (Optional)
              </label>
              <div className="relative">
                <FolderPlus className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={folderInput}
                  onChange={e => setFolderInput(e.target.value)}
                  placeholder="e.g. Systems, Programming, Essays"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                />
              </div>
            </div>
          </form>

          {/* Trap warning alert */}
          {trapWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-2 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Deliberate Seed Trap Identified: </span>
                {trapWarning}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Autodiscovered Feed Preview */}
          {discoveredInfo && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Valid Feed Discovered!</span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {discoveredInfo.title}
                </h4>
                <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
                  {discoveredInfo.feedUrl}
                </p>
              </div>

              <button
                onClick={handleConfirmAdd}
                disabled={isAdding}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
              >
                {isAdding ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Subscribe & Fetch Articles</span>
              </button>
            </div>
          )}

          {/* Quick-Picks Seed List */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Recommended Seed Blogs (Instant 1-Click Add)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {SEED_BLOGS.filter(b => !b.isTrap).map(blog => {
                const isSub = subscribedUrls.has(normalizeUrl(blog.url));

                return (
                  <div
                    key={blog.url}
                    className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {blog.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {blog.tags.join(', ')}
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickAddSeed(blog)}
                      disabled={isSub}
                      className={`p-1.5 rounded-md text-xs font-semibold flex-shrink-0 transition-colors ${
                        isSub
                          ? 'text-emerald-500 cursor-default'
                          : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}
                      title={isSub ? 'Already Subscribed' : 'Add to Subscriptions'}
                    >
                      {isSub ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
