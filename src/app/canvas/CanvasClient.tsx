'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Sparkles, Eye, EyeOff, Trash2, Search, Filter, Inbox } from 'lucide-react';
import { deleteInspirationNote, toggleNotePrivacy } from '@/app/actions';

interface NoteType {
  id: string;
  quote: string;
  thought: string;
  page: number | null;
  chapter: string | null;
  prompt: string | null;
  imageUrl: string | null;
  tag: string;
  cardStyle: string;
  isPublic: boolean;
  createdAt: Date;
  userBook: {
    book: {
      googleBooksId: string;
      title: string;
      author: string;
    };
  };
}

interface CanvasClientProps {
  notes: any[];
  username: string;
}

export default function CanvasClient({ notes, username }: CanvasClientProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleToggleNotePrivacy = async (noteId: string) => {
    const res = await toggleNotePrivacy(noteId);
    if (res?.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('このインスピレーションメモを削除しますか？')) {
      const res = await deleteInspirationNote(noteId);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    }
  };

  const filteredNotes = notes.filter((note) => {
    const matchesTag = activeFilter === 'all' || note.tag.toLowerCase() === activeFilter.toLowerCase();
    
    const matchesSearch = 
      note.quote.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.thought.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.userBook && (
        note.userBook.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.userBook.book.author.toLowerCase().includes(searchQuery.toLowerCase())
      ));

    return matchesTag && matchesSearch;
  });

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>マインド・キャンバス</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {username} さんのすべてのひらめきと言葉が並ぶビジュアルスペースです。
          </p>
        </div>
      </div>

      {/* Controls: Search and Filters */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          marginBottom: '2rem',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="引用、考察、本のタイトル、著者名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px' }}>
            {[
              { val: 'all', label: 'すべて' },
              { val: 'idea', label: '💡 アイデア' },
              { val: 'actionable', label: '🚀 行動' },
              { val: 'quote', label: '💬 引用' },
              { val: 'question', label: '❓ 問い' },
            ].map((filter) => (
              <button
                key={filter.val}
                className="btn"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  background: activeFilter === filter.val ? 'var(--color-primary)' : 'transparent',
                  color: activeFilter === filter.val ? 'white' : 'var(--text-secondary)',
                  borderRadius: '6px',
                }}
                onClick={() => setActiveFilter(filter.val)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mind Canvas Grid */}
      {filteredNotes.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-secondary)' }}>
          <Sparkles size={48} style={{ strokeWidth: 1, color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p>インスピレーションが見つかりません。検索条件を変えるか、新しくメモを作成してください。</p>
        </div>
      ) : (
        <div className="inspiration-grid">
          {filteredNotes.map((note) => (
            <div key={note.id} className={`inspiration-card card-theme-${note.cardStyle} animate-fade-in`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="card-tag">{note.tag}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleToggleNotePrivacy(note.id)}
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: 'none',
                      color: note.isPublic ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={note.isPublic ? '公開中 (非公開にする)' : '非公開 (公開にする)'}
                  >
                    {note.isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: 'none',
                      color: '#fda4af',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="メモを削除"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
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
                {note.userBook ? (
                  <Link href={`/books/${note.userBook.book.googleBooksId}`} className="card-book-link">
                    <Bookmark size={12} />
                    <span>{note.userBook.book.title}</span>
                  </Link>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.8 }}>
                    <Inbox size={12} />
                    <span>未分類のメモ</span>
                  </div>
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
  );
}
