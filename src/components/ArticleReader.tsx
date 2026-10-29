'use client';

import React, { useState, useEffect } from 'react';
import { FeedArticle, ReaderSettings } from '@/types';
import { extractArticleContent, ExtractedArticle } from '@/lib/extractor';
import { 
  ExternalLink, 
  Star, 
  CheckCircle2, 
  RotateCw, 
  BookOpen, 
  FileText, 
  Type, 
  Sun, 
  Moon, 
  Coffee,
  Check,
  Share2
} from 'lucide-react';

interface ArticleReaderProps {
  article: FeedArticle | null;
  settings: ReaderSettings;
  onUpdateSettings: (settings: Partial<ReaderSettings>) => void;
  onToggleStar: (articleId: string) => void;
  onToggleRead: (articleId: string) => void;
  onExtractedHtmlLoaded: (articleId: string, html: string) => void;
  isOnline: boolean;
}

export default function ArticleReader({
  article,
  settings,
  onUpdateSettings,
  onToggleStar,
  onToggleRead,
  onExtractedHtmlLoaded,
  isOnline,
}: ArticleReaderProps) {
  const [extractedData, setExtractedData] = useState<ExtractedArticle | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [useReaderMode, setUseReaderMode] = useState(true);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // When article changes, check if we already have extracted HTML or need to extract
  useEffect(() => {
    if (!article) {
      setExtractedData(null);
      return;
    }

    if (article.extractedHtml) {
      setExtractedData({
        title: article.title,
        content: article.extractedHtml,
        textContent: '',
        length: article.extractedHtml.length,
      });
      return;
    }

    // Auto-extract if online and setting enabled
    if (isOnline && settings.autoExtractFullText && article.link && !article.link.startsWith('data:')) {
      performExtraction(article.link, article.content || article.summary);
    } else {
      // Use fallback summary
      setExtractedData({
        title: article.title,
        content: article.content || article.summary,
        textContent: '',
        length: (article.content || article.summary).length,
      });
    }
  }, [article?.id, isOnline]);

  const performExtraction = async (url: string, fallback: string) => {
    if (!article) return;
    setIsExtracting(true);
    try {
      const extracted = await extractArticleContent(url, fallback);
      setExtractedData(extracted);
      if (extracted.content) {
        onExtractedHtmlLoaded(article.id, extracted.content);
      }
    } catch {
      // Keep feed content
      setExtractedData({
        title: article.title,
        content: fallback,
        textContent: '',
        length: fallback.length,
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyLink = () => {
    if (!article) return;
    navigator.clipboard.writeText(article.link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!article) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/50 text-zinc-400 p-8 select-none">
        <BookOpen className="w-12 h-12 text-zinc-300 mb-3 stroke-[1.5]" />
        <h3 className="text-sm font-semibold text-zinc-600">No Article Selected</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
          Choose a post from the timeline on the left to read with distraction-free typography and offline caching.
        </p>
      </div>
    );
  }

  // Determine styling based on settings
  const themeClass =
    settings.theme === 'dark'
      ? 'theme-dark'
      : settings.theme === 'sepia'
      ? 'theme-sepia'
      : 'bg-white text-zinc-900';

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const contentToRender =
    useReaderMode && extractedData?.content
      ? extractedData.content
      : article.content || article.summary;

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${themeClass}`}>
      {/* Top Reading Toolbar */}
      <div className="px-6 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm z-10">
        <div className="flex items-center space-x-2">
          {/* Reader Mode Toggle */}
          <button
            onClick={() => setUseReaderMode(!useReaderMode)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              useReaderMode
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Toggle between Full Extracted Article and Feed Summary"
          >
            {useReaderMode ? <BookOpen className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            <span>{useReaderMode ? 'Reader View' : 'Feed Summary'}</span>
          </button>

          {/* Re-extract button if online */}
          {isOnline && (
            <button
              onClick={() => performExtraction(article.link, article.content || article.summary)}
              disabled={isExtracting}
              className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors ${
                isExtracting ? 'animate-spin text-amber-600' : ''
              }`}
              title="Re-extract article content via Readability"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {article.isSavedOffline && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Offline Ready</span>
            </span>
          )}
        </div>

        {/* Right side controls: Appearance, Star, Read, External */}
        <div className="flex items-center space-x-1">
          {/* Appearance Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowAppearanceMenu(!showAppearanceMenu)}
              className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Typography & Appearance"
            >
              <Type className="w-4 h-4" />
            </button>

            {showAppearanceMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 z-50 text-xs space-y-3">
                {/* Theme Selector */}
                <div>
                  <div className="text-[10px] font-semibold uppercase text-zinc-400 tracking-wider mb-1.5">
                    Theme
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onUpdateSettings({ theme: 'light' })}
                      className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg border text-xs ${
                        settings.theme === 'light'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-medium'
                          : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light</span>
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ theme: 'sepia' })}
                      className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg border text-xs ${
                        settings.theme === 'sepia'
                          ? 'border-amber-600 bg-amber-100 text-amber-950 font-medium'
                          : 'border-amber-200 bg-[#fbf0d9] text-[#5f4b32]'
                      }`}
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Sepia</span>
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ theme: 'dark' })}
                      className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg border text-xs ${
                        settings.theme === 'dark'
                          ? 'border-amber-500 bg-zinc-800 text-amber-300 font-medium'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Font Selector */}
                <div>
                  <div className="text-[10px] font-semibold uppercase text-zinc-400 tracking-wider mb-1.5">
                    Font Family
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onUpdateSettings({ fontFamily: 'serif' })}
                      className={`py-1 rounded font-serif text-center border ${
                        settings.fontFamily === 'serif'
                          ? 'border-amber-500 bg-amber-500/10 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      Serif
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ fontFamily: 'sans' })}
                      className={`py-1 rounded font-sans text-center border ${
                        settings.fontFamily === 'sans'
                          ? 'border-amber-500 bg-amber-500/10 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      Sans
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ fontFamily: 'mono' })}
                      className={`py-1 rounded font-mono text-center border ${
                        settings.fontFamily === 'mono'
                          ? 'border-amber-500 bg-amber-500/10 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <div className="text-[10px] font-semibold uppercase text-zinc-400 tracking-wider mb-1.5">
                    Font Size ({settings.fontSize}px)
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <button
                      onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 2) })}
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => onUpdateSettings({ fontSize: 18 })}
                      className="px-2 py-1 text-zinc-500 hover:text-zinc-800 text-[11px]"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => onUpdateSettings({ fontSize: Math.min(26, settings.fontSize + 2) })}
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Star Toggle */}
          <button
            onClick={() => onToggleStar(article.id)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title={article.isStarred ? 'Unstar' : 'Star article'}
          >
            <Star
              className={`w-4 h-4 ${
                article.isStarred ? 'fill-amber-400 text-amber-500' : ''
              }`}
            />
          </button>

          {/* Mark Unread / Read */}
          <button
            onClick={() => onToggleRead(article.id)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title={article.isRead ? 'Mark as unread' : 'Mark as read'}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full inline-block ${
                article.isRead ? 'border border-zinc-400' : 'bg-amber-500'
              }`}
            />
          </button>

          {/* Share / Copy link */}
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title="Copy article link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* External original website */}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title="Open original website"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Article Content Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16 lg:px-24">
        <article className="max-w-2xl mx-auto">
          {/* Article Header */}
          <header className="mb-8 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
              {article.feedTitle}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 leading-snug">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              {article.author && <span>By {article.author}</span>}
              <span>•</span>
              <time dateTime={new Date(article.publishedAt).toISOString()}>
                {new Date(article.publishedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {extractedData?.byline && <span>• {extractedData.byline}</span>}
            </div>
          </header>

          {/* Sanitized Extracted HTML Body */}
          <div
            className={`reader-prose ${fontClass}`}
            style={{ fontSize: `${settings.fontSize}px`, lineHeight: '1.75' }}
            dangerouslySetInnerHTML={{ __html: contentToRender }}
          />

          {/* Footer of article */}
          <footer className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
            <span>Read on Small Web Reader</span>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:underline flex items-center gap-1"
            >
              <span>Visit original blog post</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </footer>
        </article>
      </div>
    </div>
  );
}
