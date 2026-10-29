export interface FeedSubscription {
  id: string;
  url: string; // Normalized feed URL
  siteUrl: string;
  title: string;
  description?: string;
  folder?: string;
  icon?: string;
  addedAt: number;
  lastFetchedAt?: number;
  etag?: string;
  lastModified?: string;
  error?: string;
  unreadCount?: number;
}

export interface FeedArticle {
  id: string; // Hash of feedUrl + link or guid
  feedUrl: string;
  feedTitle: string;
  title: string;
  link: string;
  author?: string;
  publishedAt: number;
  summary: string;
  content?: string;
  extractedHtml?: string;
  isRead: boolean;
  isStarred: boolean;
  isSavedOffline: boolean;
  fetchedAt: number;
}

export interface RecommendationReason {
  type: 'co_subscription' | 'popular' | 'blogroll';
  coSubscribedWith?: string[]; // e.g., ["Dan Luu", "Simon Willison"]
  coSubscriberCount?: number;
  explanation: string;
}

export interface DiscoverFeed {
  url: string;
  title: string;
  siteUrl: string;
  description: string;
  subscriberCount: number;
  score?: number;
  reason?: RecommendationReason;
  tags?: string[];
}

export interface PoWChallenge {
  challenge: string;
  difficulty: number;
  salt: string;
  timestamp: number;
  signature: string;
}

export interface PoWSolution {
  challenge: string;
  nonce: number;
  signature: string;
}

export interface GraphNode {
  id: string;
  name: string;
  siteUrl: string;
  val: number; // popularity
  group: string;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

export interface ReaderSettings {
  theme: 'light' | 'dark' | 'sepia';
  fontFamily: 'serif' | 'sans' | 'mono';
  fontSize: number; // e.g. 18
  anonymousDiscoveryOptIn: boolean;
  autoExtractFullText: boolean;
  lastSubmissionTimestamp?: number;
}
