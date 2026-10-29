'use client';

import React, { useState, useEffect } from 'react';
import { DiscoverFeed, FeedSubscription, ReaderSettings, PoWChallenge } from '@/types';
import { solvePoW } from '@/lib/pow-client';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Plus, 
  Check, 
  RotateCw, 
  Lock, 
  HelpCircle,
  ExternalLink,
  Flame,
  Cpu
} from 'lucide-react';

interface DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: FeedSubscription[];
  settings: ReaderSettings;
  onUpdateSettings: (settings: Partial<ReaderSettings>) => void;
  onSubscribeFeed: (url: string, title?: string, siteUrl?: string) => Promise<void>;
}

export default function DiscoverModal({
  isOpen,
  onClose,
  subscriptions,
  settings,
  onUpdateSettings,
  onSubscribeFeed,
}: DiscoverModalProps) {
  const [recommendations, setRecommendations] = useState<DiscoverFeed[]>([]);
  const [popularFeeds, setPopularFeeds] = useState<DiscoverFeed[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subscribingUrl, setSubscribingUrl] = useState<string | null>(null);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);

  const subscribedUrls = new Set(subscriptions.map(s => s.url));

  useEffect(() => {
    if (isOpen) {
      loadDiscoverData();
    }
  }, [isOpen, subscriptions.length]);

  const loadDiscoverData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch recommendations based on user subscriptions
      const userFeedUrls = subscriptions.map(s => s.url);
      const recRes = await fetch('/api/discover/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: userFeedUrls })
      });
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecommendations(recData.recommendations || []);
      }

      // 2. Fetch popular feeds
      const popRes = await fetch('/api/discover/popular');
      if (popRes.ok) {
        const popData = await popRes.json();
        setPopularFeeds(popData.feeds || []);
      }
    } catch {
      // Handle network errors gracefully
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (feed: DiscoverFeed) => {
    setSubscribingUrl(feed.url);
    try {
      await onSubscribeFeed(feed.url, feed.title, feed.siteUrl);
    } finally {
      setSubscribingUrl(null);
    }
  };

  // Submit anonymous batch with Proof of Work
  const handleManualBatchSubmit = async () => {
    if (subscriptions.length === 0) {
      setSubmissionStatus('Add at least one feed before contributing.');
      return;
    }

    setIsSubmittingBatch(true);
    setSubmissionStatus('Requesting Proof-of-Work challenge...');

    try {
      // 1. Request PoW Challenge
      const challengeRes = await fetch('/api/discover/pow-challenge');
      if (!challengeRes.ok) throw new Error('Could not get challenge');
      const challenge: PoWChallenge = await challengeRes.json();

      setSubmissionStatus(`Solving PoW challenge in browser (Difficulty ${challenge.difficulty})...`);
      const solution = await solvePoW(challenge);

      setSubmissionStatus('Submitting anonymous batch with salted hash...');

      // 2. Submit anonymous batch
      const submitPayload = {
        feeds: subscriptions.map(s => ({
          url: s.url,
          title: s.title,
          siteUrl: s.siteUrl,
          description: s.description,
        })),
        pow: solution,
      };

      const submitRes = await fetch('/api/discover/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload),
      });

      const result = await submitRes.json();
      if (!submitRes.ok) throw new Error(result.error || 'Submission failed');

      setSubmissionStatus(`✓ Anonymous batch submitted! Batch hash: ${result.batchHash}`);
      onUpdateSettings({ lastSubmissionTimestamp: Date.now() });

      // Refresh recommendations with new batch counts
      loadDiscoverData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setSubmissionStatus(`✗ ${msg}`);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Anonymous Feed Discovery
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Independent blog recommendations based on reader overlap. No accounts, no cookies, no tracking.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Privacy & Opt-In Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Zero-Knowledge Collaborative Discovery</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xl">
                When enabled, your subscription list is sent as an anonymous batch. Ranking combines co-subscription
                overlap with popularity. No persistent IDs are stored; IPs are salted-hashed and discarded within 1 hour.
              </p>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              <label className="flex items-center cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.anonymousDiscoveryOptIn}
                    onChange={e => onUpdateSettings({ anonymousDiscoveryOptIn: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    settings.anonymousDiscoveryOptIn ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`} />
                  <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.anonymousDiscoveryOptIn ? 'transform translate-x-5' : ''
                  }`} />
                </div>
                <span className="ml-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {settings.anonymousDiscoveryOptIn ? 'Opted In' : 'Opted Out'}
                </span>
              </label>

              {settings.anonymousDiscoveryOptIn && (
                <button
                  onClick={handleManualBatchSubmit}
                  disabled={isSubmittingBatch}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-lg text-xs shadow-sm transition-all"
                  title="Compute PoW and share anonymous batch"
                >
                  <Cpu className={`w-3.5 h-3.5 ${isSubmittingBatch ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingBatch ? 'Computing...' : 'Contribute Batch'}</span>
                </button>
              )}
            </div>
          </div>

          {submissionStatus && (
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-mono text-zinc-700 dark:text-zinc-300">
              {submissionStatus}
            </div>
          )}

          {/* Section 1: Recommended For You (Transparent Reasoning) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Recommended For You
                </h3>
              </div>
              <span className="text-xs text-zinc-500">
                Based on your {subscriptions.length} subscription{subscriptions.length === 1 ? '' : 's'}
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-zinc-400">
                <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                <span className="text-xs">Finding co-subscription overlaps...</span>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-zinc-400">
                <p className="text-xs">Subscribe to blogs to get personalized co-subscription recommendations!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.map(feed => renderFeedCard(feed))}
              </div>
            )}
          </section>

          {/* Section 2: Popular Across the Independent Small Web */}
          <section className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Popular on the Small Web
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {popularFeeds.map(feed => renderFeedCard(feed))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  function renderFeedCard(feed: DiscoverFeed) {
    const isSubscribed = subscribedUrls.has(feed.url);
    const isSubscribing = subscribingUrl === feed.url;

    return (
      <div
        key={feed.url}
        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group"
      >
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 transition-colors">
                {feed.title}
              </h4>
              <a
                href={feed.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-zinc-400 hover:text-amber-500 flex items-center gap-1 mt-0.5"
              >
                <span>{feed.siteUrl.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <span className="flex items-center space-x-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Users className="w-3 h-3 text-amber-500" />
              <span>{feed.subscriberCount} readers</span>
            </span>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {feed.description || 'Independent author sharing thoughtful writing.'}
          </p>
        </div>

        {/* Transparent Reason & Subscribe Action */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
          {/* Transparent Recommendation Pill */}
          <div className="text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md font-medium truncate flex-1" title={feed.reason?.explanation}>
            {feed.reason?.explanation || 'Recommended blog'}
          </div>

          <button
            onClick={() => handleSubscribe(feed)}
            disabled={isSubscribed || isSubscribing}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
              isSubscribed
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                : 'bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-sm'
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Subscribed</span>
              </>
            ) : isSubscribing ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Subscribe</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
}
