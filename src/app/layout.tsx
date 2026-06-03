import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'しおり (Shiori) - 読書インスピレーション・メモアプリ',
  description: '読書から得たインスピレーション、印象的な引用、そしてあなたの思考を美しく保管・共有するデジタルガーデンです。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <div className="app-container">
            <Navigation />
            <main className="main-content">{children}</main>
            <footer className="footer">
              <p>&copy; {new Date().getFullYear()} しおり (Shiori) - 読書インスピレーション・メモアプリ. Built with Next.js & Prisma.</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
