# Small Web Reader: Anonymous Discovery for Independent Blogs
## Offline Evaluation Presentation Slides & Speaker Notes

---

### Slide 1: Title & Vision
# Small Web Reader
### Anonymous Discovery for the Independent Web
* **The Problem**: Algorithmic platforms track users and monopolize discovery. RSS preserves privacy and direct relationships, but has historically lacked a discovery mechanism for finding new independent blogs.
* **Our Solution**: Zero-knowledge collaborative filtering. By computing co-subscription overlap without accounts or tracking, readers discover blogs followed by people with similar reading habits.
* **Presenter**: Engineering Team

---

### Slide 2: Two-Layer Architecture
# System Architecture
```
[Client Browser]
 ├── Unified Timeline & Subscriptions
 ├── Client-Side RSS 2.0 / Atom 1.0 XML Parser
 ├── Mozilla Readability + DOMPurify Sanitization
 ├── IndexedDB Storage (100% Offline-First)
 └── Proof-of-Work Web Crypto Solver (~40ms)
       │ (CORS fetch)           │ (Anonymous batch)
       ▼                        ▼
[Next.js Server API]    [Discovery Service]
 ├── GET /api/fetch      ├── POST /api/discover/submit
 │    (SSRF filter,      │    (Salted IP hash, PoW check)
 │     ETag headers)     ├── POST /api/discover/recommend
 └── Dumb proxy only     └── GET  /api/discover/popular & /graph
```
* **Strict Separation of Concerns**:
  - The server **never parses or stores article content**.
  - All feed parsing, article extraction, and caching happen in the client.

---

### Slide 3: Client-Side Feed Handling & Autodiscovery
# Resilient Feed Handling
* **Live Autodiscovery**:
  - Accepts raw website URLs (e.g. `danluu.com`).
  - Fetches HTML, checks `<link rel="alternate" type="application/rss+xml|atom+xml">`.
  - Fallback probing for `/feed`, `/atom.xml`, `/rss.xml`, `/feed.xml`.
* **Parser Resilience**:
  - Handles RSS 2.0, RSS 1.0 (RDF), and Atom 1.0.
  - Recovers from unclosed tags and malformed XML with HTML fallback.
  - Dead feeds and upstream HTTP errors fail gracefully without breaking the timeline.
* **Conditional Fetching**:
  - Forwards `If-None-Match` (ETag) and `If-Modified-Since` (Last-Modified).
  - Handles 304 Not Modified to eliminate redundant network traffic.

---

### Slide 4: Full-Text Reading & Security
# Reading View & Sanitization
* **Mozilla Readability Extraction**:
  - Fetches original article via dumb CORS proxy.
  - Strips sidebars, navigational menus, and ads to yield clean prose.
* **Security & Sanitization**:
  - **DOMPurify** with strict allowlist.
  - Proxied content is untrusted: strips `<script>`, `<iframe>`, forms, inline `onclick`/`onerror`.
* **Offline-First & Graceful Fallback**:
  - If extraction fails or original site blocks scrapers, falls back to the feed's summary/content.
  - Full text cached in IndexedDB for instant offline reading.

---

### Slide 5: Anonymous Discovery & Threat Model
# Privacy-Preserving Collaborative Filtering
* **No Accounts, No Tracking**:
  - Users have no accounts, cookies, or persistent IDs.
  - Opt-in batch submission sends only normalized feed URLs.
* **Abuse Resistance**:
  1. **Proof-of-Work (PoW)**: Client solves SHA-256 puzzle with difficulty 3, raising the cost of botnet ballot stuffing.
  2. **Salted Hash Rate Limiting**: IP is combined with a daily rotating salt and hashed with SHA-256; automatically expires within 1 hour.
  3. **Batch Deduplication**: Identical batches are discarded via SHA-256 batch hash.
  4. **SSRF Guard**: Blocks loopback, private IPv4/IPv6, and cloud metadata (169.254.169.254).
* **Transparent Recommendations**:
  - Every suggested blog clearly explains *why* it was recommended:
  - *"Followed by readers who also follow Dan Luu and Julia Evans"*

---

### Slide 6: Bonus Quest & Technical Innovations
# Bonus Features & Quest Detection
1. **Bonus Quest (+10 Extra Points)**:
   - *Trap Detected*: The seed dataset contains duplicate path variations for Simon Willison (`https://simonwillison.net/atom/entries/` vs `/entries`).
   - *Resolution*: Implemented URL canonicalization engine that resolves aliases to prevent ranking distortion. In-app audit modal generates an instant evaluator report.
2. **Interactive "Blogs Like This" Graph View**:
   - Physics-based force layout visualizing blog co-subscription clusters.
3. **OPML 2.0 Import & Export**:
   - Seamless data portability across all RSS ecosystem readers.
4. **Per-Feed Folders & Tags**:
   - Organize subscriptions into custom categories.

---

### Slide 7: Live Demo & Q&A
# Live Demonstration
1. Add feed via website autodiscovery (`danluu.com`).
2. Read extracted article in Reader Mode (Serif / Sepia / Dark).
3. Cut internet connection (DevTools Offline) -> read cached articles seamlessly.
4. Open Discovery modal -> view transparent recommendations -> solve PoW & submit anonymous batch.
5. Inspect the interactive co-subscription network graph.

**Thank you! Questions?**
