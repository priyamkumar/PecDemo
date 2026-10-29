'use client';

import React, { useState } from 'react';
import { FeedArticle } from '@/types';
import { 
  CheckCheck, 
  RotateCw, 
  Search, 
  Star, 
  Clock, 
  CheckCircle2, 
  X,
  Sparkles
} from 'lucide-react';

interface ArticleListProps {
  articles: FeedArticle[];
  selectedArticleId: string | null;
  onSelectArticle: (article: FeedArticle) => void;
  onToggleStar: (articleId: string) => void;
  onMarkAllRead: () => void;
  onRefreshFeeds: () => void;
  isRefreshing: boolean;
  filterTitle: string;
  onClearFilter: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ArticleList({
  articles,
  selectedArticleId,
  onSelectArticle,
  onToggleStar,
  onMarkAllRead,
  onRefreshFeeds,
  isRefreshing,
  filterTitle,
  onClearFilter,
}: ArticleListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = articles.filter(art => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      art.title.toLowerCase().includes(q) ||
      art.feedTitle.toLowerCase().includes(q) ||
      (art.author && art.author.toLowerCase().includes(q)) ||
      art.summary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-96 flex flex-col h-full bg-white border-r border-zinc-200 select-none">
      {/* Header Bar */}
      <div className="p-3 border-b border-zinc-200 bg-zinc-50/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <h2 className="font-semibold text-sm text-zinc-800">{filterTitle}</h2>
            <span className="text-xs text-zinc-500 bg-zinc-200/80 px-2 py-0.5 rounded-full font-mono">
              {filteredArticles.length}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onRefreshFeeds}
              disabled={isRefreshing}
              className={`p-1.5 rounded-md hover:bg-zinc-200/80 text-zinc-600 transition-colors ${
                isRefreshing ? 'animate-spin text-amber-600' : ''
              }`}
              title="Refresh feeds (ETag conditional fetch)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={onMarkAllRead}
              className="p-1.5 rounded-md hover:bg-zinc-200/80 text-zinc-600 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search articles or authors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline Articles List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {filteredArticles.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-xs font-medium text-zinc-500">No articles in this view</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              {searchQuery ? 'Try another search keyword.' : 'Feeds will appear here once added or refreshed.'}
            </p>
          </div>
        ) : (
          filteredArticles.map(article => {
            const isSelected = selectedArticleId === article.id;

            return (
              <div
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className={`p-3.5 cursor-pointer transition-colors relative group ${
                  isSelected
                    ? 'bg-amber-500/10 border-l-4 border-amber-500'
                    : article.isRead
                    ? 'hover:bg-zinc-50/80 bg-white opacity-85'
                    : 'hover:bg-amber-50/40 bg-white font-medium'
                }`}
              >
                {/* Top line: Feed title + Date */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                  <div className="flex items-center space-x-1.5 truncate max-w-[210px]">
                    {!article.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-zinc-700 truncate">{article.feedTitle}</span>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span className="font-mono">{formatRelativeTime(article.publishedAt)}</span>
                  </div>
                </div>

                {/* Article Title */}
                <h3
                  className={`text-xs line-clamp-2 mb-1.5 ${
                    article.isRead ? 'text-zinc-700 font-normal' : 'text-zinc-950 font-semibold'
                  }`}
                >
                  {article.title}
                </h3>

                {/* Summary Excerpt */}
                <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                  {article.summary}
                </p>

                {/* Bottom line: Offline cached indicator & Star toggle */}
                <div className="flex items-center justify-between mt-2 pt-1">
                  <div className="flex items-center space-x-1 text-[10px] text-zinc-500">
                    {article.isSavedOffline && (
                      <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Cached Offline</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleStar(article.id);
                    }}
                    className="p-1 text-zinc-400 hover:text-amber-500 transition-colors"
                    title={article.isStarred ? 'Unstar article' : 'Star article'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        article.isStarred
                          ? 'fill-amber-400 text-amber-500'
                          : 'opacity-40 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
