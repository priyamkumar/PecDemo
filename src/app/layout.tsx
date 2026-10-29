import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Small Web Reader — Anonymous Discovery for Independent Blogs',
  description: 'An offline-first RSS/Atom feed reader with privacy-preserving collaborative filtering discovery for independent blogs.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23d97706"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden bg-zinc-50 text-zinc-900 font-sans selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
