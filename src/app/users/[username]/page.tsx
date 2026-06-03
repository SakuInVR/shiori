import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { User, Book, Bookmark, ArrowLeft } from 'lucide-react';

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);

  // 1. Find user by username or ID
  let targetUser = await db.user.findUnique({
    where: { username },
  });

  if (!targetUser) {
    targetUser = await db.user.findUnique({
      where: { id: username },
    });
  }

  if (!targetUser) {
    return notFound();
  }

  // 2. Fetch user's public books
  const publicBooks = await db.userBook.findMany({
    where: {
      userId: targetUser.id,
      isPublic: true,
    },
    include: {
      book: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  // 3. Fetch user's public notes
  const publicNotes = await db.inspiration.findMany({
    where: {
      userId: targetUser.id,
      isPublic: true,
    },
    include: {
      userBook: {
        include: {
          book: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Back button */}
      <div>
        <Link
          href="/explore"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={14} />
          <span>広場に戻る</span>
        </Link>
      </div>

      {/* Profile Header */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.05))',
          borderColor: 'rgba(99, 102, 241, 0.2)',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--grad-violet)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {targetUser.name ? targetUser.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.25rem', marginBottom: '0.25rem' }}>
            {targetUser.name || targetUser.username}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            @{targetUser.username || 'user'} | 公開本棚の書籍: {publicBooks.length} 冊 | 公開メモ: {publicNotes.length} 件
          </p>
        </div>
      </div>

      {/* Shelves and Notes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Public Shelf */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            公開本棚
          </h2>

          {publicBooks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>公開されている書籍はありません。</p>
          ) : (
            <div className="bookshelf-grid">
              {publicBooks.map((ub) => (
                <div key={ub.id} className="book-card animate-fade-in">
                  <div className="book-cover-wrapper">
                    <Link href={`/books/${ub.book.googleBooksId}`}>
                      {ub.book.coverUrl ? (
                        <img src={ub.book.coverUrl} alt={ub.book.title} className="book-cover-img" />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                          <Book size={32} />
                        </div>
                      )}
                    </Link>
                  </div>
                  <Link href={`/books/${ub.book.googleBooksId}`} className="book-title" title={ub.book.title}>
                    {ub.book.title}
                  </Link>
                  <div className="book-author" title={ub.book.author}>{ub.book.author}</div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    {ub.status === 'reading' ? '📖 読書中' : ub.status === 'completed' ? '✅ 読了' : '⏳ 読みたい'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Public Notes */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            公開インスピレーション・メモ
          </h2>

          {publicNotes.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <Bookmark size={32} style={{ strokeWidth: 1.5, color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p>公開されているインスピレーションメモはありません。</p>
            </div>
          ) : (
            <div className="inspiration-grid">
              {publicNotes.map((note) => (
                <div key={note.id} className={`inspiration-card card-theme-${note.cardStyle} animate-fade-in`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="card-tag">{note.tag}</span>
                  </div>

                  {note.imageUrl && (
                    <div className="card-image-wrapper">
                      <img src={note.imageUrl} alt="Quote annotation" className="card-image-img" />
                    </div>
                  )}

                  <p className="card-quote">{note.quote}</p>

                  <div className="card-thought">
                    {note.prompt && <div className="card-prompt-label">{note.prompt}</div>}
                    <p style={{ margin: 0 }}>{note.thought}</p>
                  </div>

                  <div className="card-footer">
                    {note.userBook && (
                      <Link href={`/books/${note.userBook.book.googleBooksId}`} className="card-book-link">
                        <Bookmark size={12} />
                        <span>{note.userBook.book.title}</span>
                      </Link>
                    )}
                    <span>
                      {note.chapter ? `${note.chapter} ` : ''}
                      {note.page ? `${note.page}p` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
