'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FeedSubscription, 
  FeedArticle, 
  ReaderSettings 
} from '@/types';
import { 
  getAllSubscriptions, 
  saveSubscription, 
  deleteSubscription,
  getAllArticles, 
  saveArticles, 
  updateArticleState, 
  markAllArticlesAsRead,
  getSettings, 
  saveSettings 
} from '@/lib/storage';
import { parseFeedXml } from '@/lib/parser';
import { normalizeUrl } from '@/lib/normalize-url';
import { SEED_BLOGS } from '@/lib/seed-data';

import Sidebar from '@/components/Sidebar';
import ArticleList from '@/components/ArticleList';
import ArticleReader from '@/components/ArticleReader';
import DiscoverModal from '@/components/DiscoverModal';
import BlogGraphModal from '@/components/BlogGraphModal';
import AddFeedModal from '@/components/AddFeedModal';
import OpmlModal from '@/components/OpmlModal';
import TrapReportModal from '@/components/TrapReportModal';
import { ImportedOpmlFeed } from '@/lib/opml';

export default function ReaderApp() {
  const [subscriptions, setSubscriptions] = useState<FeedSubscription[]>([]);
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<ReaderSettings>({
    theme: 'light',
    fontFamily: 'serif',
    fontSize: 18,
    anonymousDiscoveryOptIn: true,
    autoExtractFullText: true,
  });

  const [activeFilter, setActiveFilter] = useState<{
    type: 'all' | 'unread' | 'starred' | 'feed' | 'folder';
    value?: string;
  }>({ type: 'all' });

  const [isOnline, setIsOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isOpmlOpen, setIsOpmlOpen] = useState(false);
  const [isTrapOpen, setIsTrapOpen] = useState(false);

  // 1. Initial Load & Network Listeners
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      refreshFeeds();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    initAppData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initAppData = async () => {
    try {
      const storedSettings = await getSettings();
      setSettingsState(storedSettings);

      const storedSubs = await getAllSubscriptions();
      const storedArts = await getAllArticles();

      if (storedSubs.length === 0) {
        // First-time visit: seed with 3 high quality indie feeds
        const starterSeeds = [
          SEED_BLOGS[0], // Simon Willison
          SEED_BLOGS[1], // Dan Luu
          SEED_BLOGS[2], // Julia Evans
        ];

        const initialSubs: FeedSubscription[] = starterSeeds.map(s => ({
          id: s.url,
          url: normalizeUrl(s.url),
          siteUrl: s.siteUrl,
          title: s.title,
          description: s.description,
          folder: s.tags[0] || 'Indie Tech',
          addedAt: Date.now(),
        }));

        for (const sub of initialSubs) {
          await saveSubscription(sub);
        }

        setSubscriptions(initialSubs);
        // Refresh to fetch initial articles
        refreshFeeds(initialSubs);
      } else {
        setSubscriptions(storedSubs);
        setArticles(storedArts);
        if (storedArts.length > 0 && !selectedArticleId) {
          setSelectedArticleId(storedArts[0].id);
        }
        // Background refresh when online
        if (navigator.onLine) {
          refreshFeeds(storedSubs);
        }
      }
    } catch {
      // IndexedDB fallback
    }
  };

  // 2. Fetch and Parse Feeds with Conditional Headers (ETag / Last-Modified)
  const refreshFeeds = useCallback(async (subsToRefresh?: FeedSubscription[]) => {
    const list = subsToRefresh || subscriptions;
    if (list.length === 0 || !navigator.onLine) return;

    setIsRefreshing(true);
    const updatedSubs = [...list];
    const newArticlesList: FeedArticle[] = [];

    for (let i = 0; i < updatedSubs.length; i++) {
      const sub = updatedSubs[i];
      try {
        const proxyUrl = `/api/fetch?url=${encodeURIComponent(sub.url)}`;
        const headers: Record<string, string> = {};
        if (sub.etag) headers['If-None-Match'] = sub.etag;
        if (sub.lastModified) headers['If-Modified-Since'] = sub.lastModified;

        const res = await fetch(proxyUrl, { headers });

        if (res.status === 304) {
          // Feed has not changed! ETag cache hit
          continue;
        }

        if (!res.ok) {
          updatedSubs[i] = { ...sub, error: `HTTP ${res.status}` };
          continue;
        }

        const etag = res.headers.get('etag') || undefined;
        const lastModified = res.headers.get('last-modified') || undefined;
        const xmlText = await res.text();

        const parsed = parseFeedXml(xmlText, sub.url);

        updatedSubs[i] = {
          ...sub,
          title: parsed.subscription.title || sub.title,
          siteUrl: parsed.subscription.siteUrl || sub.siteUrl,
          description: parsed.subscription.description || sub.description,
          etag,
          lastModified,
          lastFetchedAt: Date.now(),
          error: undefined,
        };

        newArticlesList.push(...parsed.articles);
        await saveSubscription(updatedSubs[i]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Fetch error';
        updatedSubs[i] = { ...sub, error: msg };
      }
    }

    if (newArticlesList.length > 0) {
      await saveArticles(newArticlesList);
      const allArts = await getAllArticles();
      setArticles(allArts);
      if (!selectedArticleId && allArts.length > 0) {
        setSelectedArticleId(allArts[0].id);
      }
    }

    // Update unread counts
    const allCurrentArts = await getAllArticles();
    for (let i = 0; i < updatedSubs.length; i++) {
      const unreadCount = allCurrentArts.filter(
        a => a.feedUrl === updatedSubs[i].url && !a.isRead
      ).length;
      updatedSubs[i].unreadCount = unreadCount;
    }

    setSubscriptions([...updatedSubs]);
    setIsRefreshing(false);
  }, [subscriptions, selectedArticleId]);

  // 3. User Actions
  const handleSelectArticle = async (article: FeedArticle) => {
    setSelectedArticleId(article.id);
    if (!article.isRead) {
      await updateArticleState(article.id, { isRead: true });
      setArticles(prev =>
        prev.map(a => (a.id === article.id ? { ...a, isRead: true } : a))
      );
      setSubscriptions(prev =>
        prev.map(s => {
          if (s.url === article.feedUrl) {
            return { ...s, unreadCount: Math.max(0, (s.unreadCount || 1) - 1) };
          }
          return s;
        })
      );
    }
  };

  const handleToggleStar = async (articleId: string) => {
    const target = articles.find(a => a.id === articleId);
    if (!target) return;
    const newStar = !target.isStarred;
    await updateArticleState(articleId, { isStarred: newStar });
    setArticles(prev =>
      prev.map(a => (a.id === articleId ? { ...a, isStarred: newStar } : a))
    );
  };

  const handleToggleRead = async (articleId: string) => {
    const target = articles.find(a => a.id === articleId);
    if (!target) return;
    const newRead = !target.isRead;
    await updateArticleState(articleId, { isRead: newRead });
    setArticles(prev =>
      prev.map(a => (a.id === articleId ? { ...a, isRead: newRead } : a))
    );
  };

  const handleMarkAllRead = async () => {
    const feedFilterUrl = activeFilter.type === 'feed' ? activeFilter.value : undefined;
    await markAllArticlesAsRead(feedFilterUrl);
    setArticles(prev =>
      prev.map(a => {
        if (!feedFilterUrl || a.feedUrl === feedFilterUrl) {
          return { ...a, isRead: true };
        }
        return a;
      })
    );
    setSubscriptions(prev =>
      prev.map(s => {
        if (!feedFilterUrl || s.url === feedFilterUrl) {
          return { ...s, unreadCount: 0 };
        }
        return s;
      })
    );
  };

  const handleExtractedHtmlLoaded = async (articleId: string, html: string) => {
    await updateArticleState(articleId, { extractedHtml: html, isSavedOffline: true });
    setArticles(prev =>
      prev.map(a => (a.id === articleId ? { ...a, extractedHtml: html, isSavedOffline: true } : a))
    );
  };

  const handleAddFeed = async (
    rawUrl: string,
    title?: string,
    siteUrl?: string,
    folder?: string
  ) => {
    const norm = normalizeUrl(rawUrl);
    const existing = subscriptions.find(s => s.url === norm);
    if (existing) return;

    const newSub: FeedSubscription = {
      id: norm,
      url: norm,
      siteUrl: siteUrl || norm,
      title: title || new URL(norm).hostname,
      folder,
      addedAt: Date.now(),
      unreadCount: 0,
    };

    const nextSubs = [...subscriptions, newSub];
    await saveSubscription(newSub);
    setSubscriptions(nextSubs);
    refreshFeeds([newSub]);
  };

  const handleDeleteFeed = async (url: string) => {
    await deleteSubscription(url);
    setSubscriptions(prev => prev.filter(s => s.url !== url));
    setArticles(prev => prev.filter(a => a.feedUrl !== url));
    if (selectedArticle?.feedUrl === url) {
      setSelectedArticleId(null);
    }
  };

  const handleImportOpml = async (importedFeeds: ImportedOpmlFeed[]) => {
    const newSubs: FeedSubscription[] = [];
    for (const item of importedFeeds) {
      const norm = normalizeUrl(item.xmlUrl);
      if (!subscriptions.some(s => s.url === norm) && !newSubs.some(s => s.url === norm)) {
        const sub: FeedSubscription = {
          id: norm,
          url: norm,
          siteUrl: item.htmlUrl || norm,
          title: item.title,
          folder: item.folder,
          addedAt: Date.now(),
        };
        await saveSubscription(sub);
        newSubs.push(sub);
      }
    }
    const combined = [...subscriptions, ...newSubs];
    setSubscriptions(combined);
    refreshFeeds(newSubs);
  };

  const handleUpdateSettings = async (updates: Partial<ReaderSettings>) => {
    const updated = await saveSettings(updates);
    setSettingsState(updated);
  };

  // Filtered articles list computation
  const filteredArticles = articles.filter(art => {
    if (activeFilter.type === 'unread') return !art.isRead;
    if (activeFilter.type === 'starred') return art.isStarred;
    if (activeFilter.type === 'feed') return art.feedUrl === activeFilter.value;
    if (activeFilter.type === 'folder') {
      const matchingFeedUrls = new Set(
        subscriptions.filter(s => s.folder === activeFilter.value).map(s => s.url)
      );
      return matchingFeedUrls.has(art.feedUrl);
    }
    return true; // 'all'
  });

  const selectedArticle = articles.find(a => a.id === selectedArticleId) || null;
  const totalUnreadCount = articles.filter(a => !a.isRead).length;
  const totalStarredCount = articles.filter(a => a.isStarred).length;

  const getFilterTitle = () => {
    if (activeFilter.type === 'unread') return 'Unread Articles';
    if (activeFilter.type === 'starred') return 'Starred Articles';
    if (activeFilter.type === 'feed') {
      const sub = subscriptions.find(s => s.url === activeFilter.value);
      return sub ? sub.title : 'Feed';
    }
    if (activeFilter.type === 'folder') return activeFilter.value || 'Folder';
    return 'All Articles';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-100 select-none">
      {/* 1. Sidebar */}
      <Sidebar
        subscriptions={subscriptions}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenDiscoverModal={() => setIsDiscoverOpen(true)}
        onOpenGraphModal={() => setIsGraphOpen(true)}
        onOpenOpmlModal={() => setIsOpmlOpen(true)}
        onDeleteFeed={handleDeleteFeed}
        totalUnreadCount={totalUnreadCount}
        totalStarredCount={totalStarredCount}
        isOnline={isOnline}
        onOpenTrapModal={() => setIsTrapOpen(true)}
      />

      {/* 2. Article Timeline List */}
      <ArticleList
        articles={filteredArticles}
        selectedArticleId={selectedArticleId}
        onSelectArticle={handleSelectArticle}
        onToggleStar={handleToggleStar}
        onMarkAllRead={handleMarkAllRead}
        onRefreshFeeds={() => refreshFeeds()}
        isRefreshing={isRefreshing}
        filterTitle={getFilterTitle()}
        onClearFilter={() => setActiveFilter({ type: 'all' })}
      />

      {/* 3. Full-Text Reading View */}
      <ArticleReader
        article={selectedArticle}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onToggleStar={handleToggleStar}
        onToggleRead={handleToggleRead}
        onExtractedHtmlLoaded={handleExtractedHtmlLoaded}
        isOnline={isOnline}
      />

      {/* Modals */}
      <DiscoverModal
        isOpen={isDiscoverOpen}
        onClose={() => setIsDiscoverOpen(false)}
        subscriptions={subscriptions}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onSubscribeFeed={handleAddFeed}
      />

      <BlogGraphModal
        isOpen={isGraphOpen}
        onClose={() => setIsGraphOpen(false)}
        onSubscribeFeed={handleAddFeed}
        subscribedUrls={new Set(subscriptions.map(s => s.url))}
      />

      <AddFeedModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddFeed={handleAddFeed}
        subscribedUrls={new Set(subscriptions.map(s => s.url))}
      />

      <OpmlModal
        isOpen={isOpmlOpen}
        onClose={() => setIsOpmlOpen(false)}
        subscriptions={subscriptions}
        onImportFeeds={handleImportOpml}
      />

      <TrapReportModal
        isOpen={isTrapOpen}
        onClose={() => setIsTrapOpen(false)}
      />
    </div>
  );
}
