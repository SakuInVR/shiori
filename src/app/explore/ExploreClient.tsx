'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, Compass, MessageSquare, Book, User, Search, Award, ChevronRight } from 'lucide-react';

interface NoteType {
  id: string;
  quote: string;
  thought: string;
  page: number | null;
  chapter: string | null;
  prompt: string | null;
  tag: string;
  cardStyle: string;
  isPublic: boolean;
  createdAt: Date;
  user: {
    name: string | null;
    username: string | null;
  };
  userBook: {
    book: {
      googleBooksId: string;
      title: string;
      author: string;
    };
  };
}

interface BookType {
  id: string;
  googleBooksId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  userBooks: {
    user: {
      name: string | null;
      username: string | null;
    };
  }[];
}

interface ExploreClientProps {
  initialNotes: any[];
  initialBooks: any[];
}

export default function ExploreClient({ initialNotes, initialBooks }: ExploreClientProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'books' | 'authors'>('notes');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Extract unique authors
  const authorMap: Record<string, { name: string; booksCount: number; books: BookType[] }> = {};
  initialBooks.forEach((book) => {
    const authors = book.author.split(', ');
    authors.forEach((authorName: string) => {
      const cleanName = authorName.trim();
      if (!cleanName) return;
      if (!authorMap[cleanName]) {
        authorMap[cleanName] = { name: cleanName, booksCount: 0, books: [] };
      }
      authorMap[cleanName].booksCount += 1;
      authorMap[cleanName].books.push(book);
    });
  });
  const authorsList = Object.values(authorMap).sort((a, b) => b.booksCount - a.booksCount);

  // 2. Filters & Search matching
  const filteredNotes = initialNotes.filter((note) => {
    const term = searchQuery.toLowerCase();
    return (
      note.quote.toLowerCase().includes(term) ||
      note.thought.toLowerCase().includes(term) ||
      note.userBook.book.title.toLowerCase().includes(term) ||
      note.userBook.book.author.toLowerCase().includes(term) ||
      (note.user?.name && note.user.name.toLowerCase().includes(term))
    );
  });

  const filteredBooks = initialBooks.filter((book) => {
    const term = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term)
    );
  });

  const filteredAuthors = authorsList.filter((author) => {
    return author.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #a5b4fc, #818cf8, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          コミュニティ広場
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          全国の読書家たちが紡ぎ出したインスピレーションや、読まれている本が集まる共有スペースです。
        </p>
      </div>

      {/* Control Panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
              placeholder={
                activeTab === 'notes'
                  ? '引用、感想、本、読者名で検索...'
                  : activeTab === 'books'
                  ? 'タイトル、著者名で本を探す...'
                  : '著者名で検索...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Toggle Tab Buttons */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px' }}>
            {[
              { val: 'notes', label: 'ひらめきメモ', icon: <MessageSquare size={14} /> },
              { val: 'books', label: '登録されている本', icon: <Book size={14} /> },
              { val: 'authors', label: '著者で探す', icon: <Award size={14} /> },
            ].map((tab) => (
              <button
                key={tab.val}
                className="btn"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: activeTab === tab.val ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === tab.val ? 'white' : 'var(--text-secondary)',
                  borderRadius: '6px',
                }}
                onClick={() => {
                  setActiveTab(tab.val as any);
                  setSearchQuery('');
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Aggregated View Area */}

      {/* View 1: Public Notes Grid */}
      {activeTab === 'notes' && (
        filteredNotes.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-secondary)' }}>
            <Compass size={48} style={{ strokeWidth: 1, color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <p>公開されているメモが見つかりませんでした。</p>
          </div>
        ) : (
          <div className="inspiration-grid">
            {filteredNotes.map((note) => (
              <div key={note.id} className={`inspiration-card card-theme-${note.cardStyle} animate-fade-in`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="card-tag">{note.tag}</span>
                  
                  {/* Author Link */}
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
                  <Link href={`/books/${note.userBook.book.googleBooksId}`} className="card-book-link">
                    <Bookmark size={12} />
                    <span>{note.userBook.book.title}</span>
                  </Link>
                  <span>
                    {note.chapter ? `${note.chapter} ` : ''}
                    {note.page ? `${note.page}p` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* View 2: Popular Books Grid */}
      {activeTab === 'books' && (
        filteredBooks.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-secondary)' }}>
            <Book size={48} style={{ strokeWidth: 1, color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <p>本が見つかりませんでした。</p>
          </div>
        ) : (
          <div className="bookshelf-grid">
            {filteredBooks.map((book) => {
              const readerCount = book.userBooks.length;
              return (
                <div key={book.id} className="book-card animate-fade-in">
                  <div className="book-cover-wrapper">
                    <Link href={`/books/${book.googleBooksId}`}>
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="book-cover-img" />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: '1rem' }}>
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
                    <span>読者: {readerCount}名が登録中</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* View 3: Unique Authors List */}
      {activeTab === 'authors' && (
        filteredAuthors.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-secondary)' }}>
            <Award size={48} style={{ strokeWidth: 1, color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <p>著者が見つかりませんでした。</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {filteredAuthors.map((author, index) => (
              <Link
                key={index}
                href={`/authors/${encodeURIComponent(author.name)}`}
                className="glass-panel glass-panel-hover animate-fade-in"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {author.name}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    登録本: {author.booksCount}冊
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
