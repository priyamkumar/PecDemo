'use client';

import React, { useState } from 'react';
import { FeedSubscription } from '@/types';
import { 
  Rss, 
  Compass, 
  Share2, 
  FolderPlus, 
  Star, 
  Inbox, 
  Trash2, 
  Plus, 
  FileUp, 
  AlertTriangle,
  Folder,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wifi,
  WifiOff
} from 'lucide-react';

interface SidebarProps {
  subscriptions: FeedSubscription[];
  activeFilter: {
    type: 'all' | 'unread' | 'starred' | 'feed' | 'folder';
    value?: string;
  };
  onSelectFilter: (filter: { type: 'all' | 'unread' | 'starred' | 'feed' | 'folder'; value?: string }) => void;
  onOpenAddModal: () => void;
  onOpenDiscoverModal: () => void;
  onOpenGraphModal: () => void;
  onOpenOpmlModal: () => void;
  onDeleteFeed: (url: string) => void;
  totalUnreadCount: number;
  totalStarredCount: number;
  isOnline: boolean;
  onOpenTrapModal: () => void;
}

export default function Sidebar({
  subscriptions,
  activeFilter,
  onSelectFilter,
  onOpenAddModal,
  onOpenDiscoverModal,
  onOpenGraphModal,
  onOpenOpmlModal,
  onDeleteFeed,
  totalUnreadCount,
  totalStarredCount,
  isOnline,
  onOpenTrapModal
}: SidebarProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Group subscriptions by folder
  const foldersMap = new Map<string, FeedSubscription[]>();
  const uncategorized: FeedSubscription[] = [];

  for (const sub of subscriptions) {
    if (sub.folder) {
      if (!foldersMap.has(sub.folder)) {
        foldersMap.set(sub.folder, []);
      }
      foldersMap.get(sub.folder)!.push(sub);
    } else {
      uncategorized.push(sub);
    }
  }

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  return (
    <aside className="w-72 bg-zinc-900 text-zinc-300 flex flex-col h-full border-r border-zinc-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 shadow-md">
            <Rss className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-zinc-100 tracking-tight flex items-center gap-1.5">
              Small Web Reader
            </h1>
            <span className="text-[10px] text-amber-400 font-mono tracking-wider uppercase">Indie & Anonymous</span>
          </div>
        </div>

        {/* Online / Offline status indicator */}
        <div 
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
            isOnline ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
          }`}
          title={isOnline ? 'Online - Live syncing enabled' : 'Offline - Reading from local cache'}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Primary Discovery Navigation */}
      <div className="p-3 space-y-1 border-b border-zinc-800/80">
        <button
          onClick={onOpenDiscoverModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all shadow-sm group"
        >
          <div className="flex items-center space-x-2.5">
            <Compass className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            <span>Discover Feeds</span>
          </div>
          <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">Anonymous</span>
        </button>

        <button
          onClick={onOpenGraphModal}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors"
        >
          <Share2 className="w-4 h-4 text-cyan-400" />
          <span>Blogs Graph View</span>
        </button>

        <button
          onClick={onOpenTrapModal}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-amber-200/90 hover:bg-zinc-800/80 border border-amber-500/20 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Bonus Trap Quest</span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono font-bold">+10 pts</span>
        </button>
      </div>

      {/* Main Views Navigation */}
      <div className="px-3 pt-3 pb-2 space-y-0.5 border-b border-zinc-800/60">
        <button
          onClick={() => onSelectFilter({ type: 'all' })}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeFilter.type === 'all'
              ? 'bg-zinc-800 text-zinc-100 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Inbox className="w-4 h-4 text-zinc-400" />
            <span>All Articles</span>
          </div>
          {totalUnreadCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {totalUnreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectFilter({ type: 'unread' })}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeFilter.type === 'unread'
              ? 'bg-zinc-800 text-zinc-100 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 ml-1 mr-1" />
            <span>Unread</span>
          </div>
          {totalUnreadCount > 0 && (
            <span className="text-xs text-zinc-400 font-mono">
              {totalUnreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectFilter({ type: 'starred' })}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeFilter.type === 'starred'
              ? 'bg-zinc-800 text-zinc-100 font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span>Starred</span>
          </div>
          {totalStarredCount > 0 && (
            <span className="text-xs text-zinc-400 font-mono">
              {totalStarredCount}
            </span>
          )}
        </button>
      </div>

      {/* Subscriptions List Section */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <div className="flex items-center justify-between px-2 text-xs font-medium text-zinc-400 tracking-wider uppercase">
          <span>Feeds ({subscriptions.length})</span>
          <button
            onClick={onOpenAddModal}
            className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            title="Add Feed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center">
            <p className="text-xs text-zinc-400 mb-3">No subscriptions yet.</p>
            <button
              onClick={onOpenDiscoverModal}
              className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-medium transition-colors"
            >
              Explore Discover Blogs
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Folders */}
            {Array.from(foldersMap.entries()).map(([folderName, feeds]) => {
              const isCollapsed = collapsedFolders[folderName];
              const folderUnread = feeds.reduce((sum, f) => sum + (f.unreadCount || 0), 0);

              return (
                <div key={folderName} className="space-y-0.5">
                  <div
                    onClick={() => toggleFolder(folderName)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                      <Folder className="w-3.5 h-3.5 text-amber-500" />
                      <span>{folderName}</span>
                    </div>
                    {folderUnread > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                        {folderUnread}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="pl-4 space-y-0.5 border-l border-zinc-800 ml-3">
                      {feeds.map(feed => renderFeedItem(feed))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized Feeds */}
            {uncategorized.map(feed => renderFeedItem(feed))}
          </div>
        )}
      </div>

      {/* Footer Actions: Add Feed, OPML Import/Export */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 space-y-2">
        <button
          onClick={onOpenAddModal}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Add Website / Feed</span>
        </button>

        <button
          onClick={onOpenOpmlModal}
          className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>Import / Export OPML</span>
        </button>
      </div>
    </aside>
  );

  function renderFeedItem(feed: FeedSubscription) {
    const isSelected = activeFilter.type === 'feed' && activeFilter.value === feed.url;

    return (
      <div
        key={feed.url}
        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
          isSelected
            ? 'bg-amber-500/20 text-amber-200 font-medium'
            : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'
        }`}
      >
        <button
          onClick={() => onSelectFilter({ type: 'feed', value: feed.url })}
          className="flex items-center space-x-2 flex-1 min-w-0 text-left"
          title={feed.title}
        >
          {/* Favicon or initial */}
          <div className="w-4 h-4 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-amber-400 flex-shrink-0">
            {feed.title.charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{feed.title}</span>
        </button>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {feed.error && (
            <span title={`Feed fetch issue: ${feed.error}`} className="text-rose-400">
              <AlertTriangle className="w-3 h-3" />
            </span>
          )}

          {(feed.unreadCount || 0) > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-amber-500/30 group-hover:text-amber-300">
              {feed.unreadCount}
            </span>
          )}

          <button
            onClick={e => {
              e.stopPropagation();
              if (confirm(`Unsubscribe from "${feed.title}"?`)) {
                onDeleteFeed(feed.url);
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 hover:bg-zinc-800 rounded transition-opacity"
            title="Unsubscribe"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
}
