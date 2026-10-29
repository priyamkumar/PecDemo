export interface SeedBlog {
  url: string;
  title: string;
  siteUrl: string;
  description: string;
  tags: string[];
  isTrap?: boolean;
  trapReason?: string;
}

export const SEED_BLOGS: SeedBlog[] = [
  {
    url: 'https://simonwillison.net/atom/entries/',
    title: "Simon Willison's Weblog",
    siteUrl: 'https://simonwillison.net',
    description: 'Co-creator of Django, writing about LLMs, Python, open source and web tools.',
    tags: ['AI', 'Python', 'Web Dev', 'Open Source']
  },
  {
    url: 'https://danluu.com/atom.xml',
    title: 'Dan Luu',
    siteUrl: 'https://danluu.com',
    description: 'In-depth essays on computer hardware, systems performance, and engineering culture.',
    tags: ['Systems', 'Performance', 'Hardware']
  },
  {
    url: 'https://jvns.ca/atom.xml',
    title: 'Julia Evans',
    siteUrl: 'https://jvns.ca',
    description: 'Accessible, friendly explorations of networking, Linux internals, Git, and DNS.',
    tags: ['Linux', 'Networking', 'Learning']
  },
  {
    url: 'https://rachelbythebay.com/w/atom.xml',
    title: 'Rachel by the Bay',
    siteUrl: 'https://rachelbythebay.com',
    description: 'Real-world system administration, debugging war stories, and systems engineering.',
    tags: ['SysAdmin', 'Debugging', 'Unix']
  },
  {
    url: 'https://brandur.org/articles.atom',
    title: 'Brandur Leach',
    siteUrl: 'https://brandur.org',
    description: 'Database architecture, idempotency, Stripe infrastructure, and software craft.',
    tags: ['Databases', 'Architecture', 'Postgres']
  },
  {
    url: 'https://www.robinsloan.com/feed.xml',
    title: 'Robin Sloan',
    siteUrl: 'https://www.robinsloan.com',
    description: 'Author of Mr. Penumbra, writing on media, artificial intelligence, and homebrewed apps.',
    tags: ['Writing', 'Art', 'IndieWeb']
  },
  {
    url: 'https://mitchellh.com/feed.xml',
    title: 'Mitchell Hashimoto',
    siteUrl: 'https://mitchellh.com',
    description: 'Founder of HashiCorp, now building Ghostty terminal, Zig, and systems tools.',
    tags: ['Systems', 'Zig', 'Tools']
  },
  {
    url: 'https://sivers.org/feed.xml',
    title: 'Derek Sivers',
    siteUrl: 'https://sivers.org',
    description: 'Short, punchy essays on philosophy, entrepreneurship, and independent living.',
    tags: ['Philosophy', 'Life', 'Essays']
  },
  {
    url: 'https://shkspr.mobi/blog/feed/atom/',
    title: 'Terence Eden',
    siteUrl: 'https://shkspr.mobi/blog/',
    description: 'Open standards advocate, hacker, gadgets, Fediverse, and digital rights.',
    tags: ['Open Standards', 'Fediverse', 'IndieWeb']
  },
  {
    url: 'https://overreacted.io/rss.xml',
    title: 'Overreacted',
    siteUrl: 'https://overreacted.io',
    description: 'Dan Abramov’s personal blog on React, JavaScript, mental models, and frontend.',
    tags: ['React', 'JavaScript', 'Frontend']
  },
  {
    url: 'https://www.hillelwayne.com/index.xml',
    title: 'Hillel Wayne',
    siteUrl: 'https://www.hillelwayne.com',
    description: 'Formal methods, TLA+, software testing, and computer science history.',
    tags: ['Formal Methods', 'TLA+', 'Testing']
  },
  {
    url: 'https://xeiaso.net/blog.rss',
    title: 'Xe Iaso',
    siteUrl: 'https://xeiaso.net',
    description: 'Tailscale engineer, thoughtful storytelling, Nix, Rust, and systems computing.',
    tags: ['Nix', 'Rust', 'Networking']
  },
  {
    url: 'http://antirez.com/rss',
    title: 'Antirez (Salvatore Sanfilippo)',
    siteUrl: 'http://antirez.com',
    description: 'Creator of Redis, writing about C, databases, distributed systems, and coding.',
    tags: ['C', 'Databases', 'Redis']
  },
  {
    url: 'http://scripting.com/rss.xml',
    title: 'Scripting News (Dave Winer)',
    siteUrl: 'http://scripting.com',
    description: 'The grandfather of RSS, podcasting and blogging. Daily notes since 1994.',
    tags: ['Blogging', 'RSS', 'History']
  },
  // DELIBERATE TRAP (Bonus Quest):
  // Duplicate feed alias of Simon Willison's entries or Dan Luu with protocol/trailing slash variant
  {
    url: 'https://simonwillison.net/atom/entries',
    title: "Simon Willison's Weblog (Duplicate Path Trap)",
    siteUrl: 'https://simonwillison.net',
    description: 'Deliberate trap URL without trailing slash pointing to the exact same blog.',
    tags: ['Bonus Trap', 'AI'],
    isTrap: true,
    trapReason: 'Duplicate URL variant of Simon Willison (missing trailing slash). URL normalization resolves this to the canonical feed.'
  }
];

// Pre-populated realistic anonymous subscription batches to seed collaborative filtering
export const SEED_BATCHES: string[][] = [
  // Batch 1: Systems & debugging heavy reader
  [
    'https://danluu.com/atom.xml',
    'https://rachelbythebay.com/w/atom.xml',
    'https://jvns.ca/atom.xml',
    'https://mitchellh.com/feed.xml'
  ],
  // Batch 2: Systems + Databases
  [
    'https://danluu.com/atom.xml',
    'https://brandur.org/articles.atom',
    'http://antirez.com/rss',
    'https://rachelbythebay.com/w/atom.xml'
  ],
  // Batch 3: Modern Web & AI
  [
    'https://simonwillison.net/atom/entries/',
    'https://jvns.ca/atom.xml',
    'https://overreacted.io/rss.xml',
    'https://shkspr.mobi/blog/feed/atom/'
  ],
  // Batch 4: Indie Web & Essays
  [
    'https://www.robinsloan.com/feed.xml',
    'https://sivers.org/feed.xml',
    'https://shkspr.mobi/blog/feed/atom/',
    'http://scripting.com/rss.xml'
  ],
  // Batch 5: Deep CS & Formal verification
  [
    'https://www.hillelwayne.com/index.xml',
    'https://danluu.com/atom.xml',
    'https://brandur.org/articles.atom',
    'https://mitchellh.com/feed.xml'
  ],
  // Batch 6: Rust, Nix & Python
  [
    'https://xeiaso.net/blog.rss',
    'https://simonwillison.net/atom/entries/',
    'https://jvns.ca/atom.xml',
    'https://mitchellh.com/feed.xml'
  ],
  // Batch 7: General Tech Enthusiast
  [
    'https://simonwillison.net/atom/entries/',
    'https://danluu.com/atom.xml',
    'https://overreacted.io/rss.xml',
    'https://sivers.org/feed.xml'
  ],
  // Batch 8: Infrastructure & Systems
  [
    'https://brandur.org/articles.atom',
    'https://rachelbythebay.com/w/atom.xml',
    'https://danluu.com/atom.xml',
    'https://xeiaso.net/blog.rss'
  ]
];
