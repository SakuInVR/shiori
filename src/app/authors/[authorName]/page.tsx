import { db } from '@/lib/db';
import Link from 'next/link';
import { Award, Book, User, Bookmark, ArrowLeft } from 'lucide-react';

export default async function AuthorHubPage({
  params,
}: {
  params: Promise<{ authorName: string }>;
}) {
  const resolvedParams = await params;
  const authorName = decodeURIComponent(resolvedParams.authorName);

  // 1. Fetch books by this author
  const books = await db.book.findMany({
    where: {
      author: {
        contains: authorName,
      },
    },
    include: {
      userBooks: {
        where: { isPublic: true },
        include: {
          user: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  // 2. Fetch public notes written on this author's books
  const notes = await db.inspiration.findMany({
    where: {
      isPublic: true,
      userBook: {
        book: {
          author: {
            contains: authorName,
          },
        },
      },
    },
    include: {
      user: {
        select: {
          name: true,
          username: true,
        },
      },
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
      
      {/* Back to explore */}
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

      {/* Author Header */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          background: 'linear-gradient(to right, rgba(6, 182, 212, 0.1), rgba(99, 102, 241, 0.05))',
          borderColor: 'rgba(6, 182, 212, 0.2)',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--grad-cosmic)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Award size={32} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.25rem', marginBottom: '0.25rem' }}>
            著者: {authorName}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            この著者について登録されている本: {books.length} 冊 | 公開メモ: {notes.length} 件
          </p>
        </div>
      </div>

      {/* Books and Notes Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Books Section */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            登録されている書籍一覧
          </h2>
          
          {books.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>この著者に関する書籍は登録されていません。</p>
          ) : (
            <div className="bookshelf-grid">
              {books.map((book) => (
                <div key={book.id} className="book-card animate-fade-in">
                  <div className="book-cover-wrapper">
                    <Link href={`/books/${book.googleBooksId}`}>
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="book-cover-img" />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                          <Book size={32} />
                        </div>
                      )}
                    </Link>
                  </div>
                  <Link href={`/books/${book.googleBooksId}`} className="book-title" title={book.title}>
                    {book.title}
                  </Link>
                  <div className="book-author" title={book.author}>{book.author}</div>
                  
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <User size={12} style={{ color: 'var(--color-primary)' }} />
                    <span>読者: {book.userBooks.length}名が登録中</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            この著者の本に関する公開インスピレーション・メモ
          </h2>

          {notes.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <Bookmark size={32} style={{ strokeWidth: 1.5, color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p>この著者の書籍に対する公開メモはまだありません。</p>
            </div>
          ) : (
            <div className="inspiration-grid">
              {notes.map((note) => (
                <div key={note.id} className={`inspiration-card card-theme-${note.cardStyle} animate-fade-in`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="card-tag">{note.tag}</span>
                    
                    <Link
                      href={`/users/${note.user.username || note.userId}`}
                      style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <User size={10} />
                      <span>@{note.user.name || note.user.username}</span>
                    </Link>
                  </div>

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
