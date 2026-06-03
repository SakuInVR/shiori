'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Book as BookIcon,
  Plus,
  BookOpen,
  CheckCircle,
  Clock,
  MessageSquare,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  TrendingUp,
  X,
  FileText,
  Bookmark,
  Calendar,
  Lock,
  Globe,
  Inbox,
  Link as LinkIcon,
  Edit2,
  Sparkles,
  Camera,
  Users,
  Check,
  Loader2,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import {
  updateReadingProgress,
  deleteBookFromShelf,
  createInspirationNote,
  updateInspirationNote,
  toggleBookPrivacy,
  deleteInspirationNote,
  toggleNotePrivacy,
  getGroups,
  shareBookToGroups,
} from '@/app/actions';

interface BookType {
  id: string;
  googleBooksId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
}

interface UserBookType {
  id: string;
  userId: string;
  bookId: string;
  currentPage: number;
  status: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  book: BookType;
  inspirations: any[];
  groupShares?: { groupId: string }[];
}

interface DashboardClientProps {
  initialBooks: UserBookType[];
  initialNotes: any[];
  username: string;
  userId: string;
}

export default function DashboardClient({
  initialBooks,
  initialNotes,
  username,
  userId,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'reading' | 'completed' | 'wishlist'>('all');
  
  // Note Form Drawer States
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // Note Fields
  const [selectedBookIdForNote, setSelectedBookIdForNote] = useState<string | null>(null);
  const [quote, setQuote] = useState('');
  const [thought, setThought] = useState('');
  const [page, setPage] = useState<number | ''>('');
  const [chapter, setChapter] = useState('');
  const [prompt, setPrompt] = useState('');
  const [tag, setTag] = useState('Idea');
  const [cardStyle, setCardStyle] = useState('gradient-violet');
  const [notePrivacyMode, setNotePrivacyMode] = useState<'private' | 'group' | 'public'>('private');
  const [noteSelectedGroupIds, setNoteSelectedGroupIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Groups state
  const [myGroups, setMyGroups] = useState<any[]>([]);

  // Book Privacy Dialog States
  const [editingBookPrivacy, setEditingBookPrivacy] = useState<UserBookType | null>(null);
  const [editingBookPrivacyMode, setEditingBookPrivacyMode] = useState<'private' | 'group' | 'public'>('private');
  const [editingBookSelectedGroupIds, setEditingBookSelectedGroupIds] = useState<string[]>([]);
  const [privacySaving, setPrivacySaving] = useState(false);

  useEffect(() => {
    getGroups().then((groupsList) => {
      setMyGroups(groupsList);
    });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setImageUrl(dataUrl);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const handleExtractText = async () => {
    if (!imageUrl) return;
    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const { data: { text } } = await Tesseract.recognize(
        imageUrl,
        'jpn+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      // Clean up Japanese spacing & newlines
      let cleaned = text.replace(/[\r\n]+/g, ' ');
      cleaned = cleaned.replace(/([぀-ゟぁ-んァ-ヶー一-龠々〆〤])\s+([぀-ゟぁ-んァ-ヶー一-龠々〆〤])/g, '$1$2');
      // Replace multiple spaces with a single space
      cleaned = cleaned.replace(/\s+/g, ' ');
      cleaned = cleaned.trim();

      if (cleaned) {
        setQuote(cleaned);
      } else {
        alert('画像から文字を検出できませんでした。');
      }
    } catch (err) {
      console.error(err);
      alert('文字の解析中にエラーが発生しました。');
    } finally {
      setOcrLoading(false);
    }
  };

  // Progress edit states
  const [editingProgressId, setEditingProgressId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [progressSaving, setProgressSaving] = useState(false);

  const [error, setError] = useState('');

  // 1. Separate linked and unlinked notes
  const unlinkedNotes = initialNotes.filter((n) => !n.userBookId);
  const linkedNotes = initialNotes.filter((n) => n.userBookId);

  // Filter books by active tab
  const filteredBooks = initialBooks.filter((ub) => {
    if (activeTab === 'all') return true;
    return ub.status === activeTab;
  });

  // Calculate statistics
  const stats = {
    total: initialBooks.length,
    reading: initialBooks.filter((b) => b.status === 'reading').length,
    completed: initialBooks.filter((b) => b.status === 'completed').length,
    notes: initialNotes.length,
  };

  // Prompts helper list
  const reflectionPrompts = [
    'この内容を自分の生活やアクションにどう反映するか？',
    '著者のこの見解に対する別の視点や反対意見はあるか？',
    'このインスピレーションからどんな新しいアイデアが生まれた？',
    '他の本や知見との共通点や結びつきはあるか？',
    '今の自分にとって、この言葉が響いた理由は何だろう？',
  ];

  // Action handlers
  const handleStartQuickNote = () => {
    setIsEditingNote(false);
    setEditingNoteId(null);
    setSelectedBookIdForNote(''); // default: unlinked
    setQuote('');
    setThought('');
    setPage('');
    setChapter('');
    setPrompt('');
    setTag('Idea');
    setCardStyle('gradient-dark'); // Charcoal gradient for quick jot
    setNotePrivacyMode('private');
    setNoteSelectedGroupIds([]);
    setImageUrl('');
    setIsNoteDrawerOpen(true);
  };

  const handleStartBookNote = (ub: UserBookType) => {
    setIsEditingNote(false);
    setEditingNoteId(null);
    setSelectedBookIdForNote(ub.id); // preselected book
    setQuote('');
    setThought('');
    setPage('');
    setChapter('');
    setPrompt('');
    setTag('Idea');
    setCardStyle('gradient-violet');
    setNotePrivacyMode(ub.isPublic ? 'public' : 'private');
    const initialGroups = ub.groupShares?.map((gs) => gs.groupId) || [];
    setNoteSelectedGroupIds(initialGroups);
    if (initialGroups.length > 0 && !ub.isPublic) {
      setNotePrivacyMode('group');
    }
    setImageUrl('');
    setIsNoteDrawerOpen(true);
  };

  const handleStartEditNote = (note: any) => {
    setIsEditingNote(true);
    setEditingNoteId(note.id);
    setSelectedBookIdForNote(note.userBookId || '');
    setQuote(note.quote);
    setThought(note.thought);
    setPage(note.page !== null ? note.page : '');
    setChapter(note.chapter || '');
    setPrompt(note.prompt || '');
    setTag(note.tag);
    setCardStyle(note.cardStyle);
    
    const sharedGroups = note.groupShares?.map((gs: any) => gs.groupId) || [];
    setNoteSelectedGroupIds(sharedGroups);
    if (note.isPublic) {
      setNotePrivacyMode('public');
    } else if (sharedGroups.length > 0) {
      setNotePrivacyMode('group');
    } else {
      setNotePrivacyMode('private');
    }

    setImageUrl(note.imageUrl || '');
    setIsNoteDrawerOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote.trim() || !thought.trim()) return;

    setNoteSaving(true);
    setError('');

    const uBookId = selectedBookIdForNote || null;
    const gIds = notePrivacyMode === 'group' ? noteSelectedGroupIds : [];

    try {
      let res;
      if (isEditingNote && editingNoteId) {
        res = await updateInspirationNote(editingNoteId, {
          userBookId: uBookId,
          quote,
          thought,
          page: page !== '' ? Number(page) : null,
          chapter: chapter.trim() || null,
          prompt: prompt || null,
          imageUrl: imageUrl.trim() || null,
          tag,
          cardStyle,
          isPublic: notePrivacyMode === 'public',
          groupIds: gIds,
        });
      } else {
        res = await createInspirationNote({
          userBookId: uBookId,
          quote,
          thought,
          page: page !== '' ? Number(page) : null,
          chapter: chapter.trim() || null,
          prompt: prompt || null,
          imageUrl: imageUrl.trim() || null,
          tag,
          cardStyle,
          isPublic: notePrivacyMode === 'public',
          groupIds: gIds,
        });
      }

      if (res?.error) {
        setError(res.error);
        setNoteSaving(false);
      } else {
        setIsNoteDrawerOpen(false);
        setNoteSaving(false);
        router.refresh();
      }
    } catch (err) {
      setError('保存中にエラーが発生しました。');
      setNoteSaving(false);
    }
  };

  const handleStartEditProgress = (ub: UserBookType) => {
    setEditingProgressId(ub.id);
    setProgressValue(ub.currentPage);
  };

  const handleSaveProgress = async (ub: UserBookType) => {
    setProgressSaving(true);
    const res = await updateReadingProgress(ub.id, progressValue, ub.status);

    if (res?.error) {
      alert(res.error);
    }
    setEditingProgressId(null);
    setProgressSaving(false);
    router.refresh();
  };

  const handleDeleteBook = async (ub: UserBookType) => {
    if (confirm(`「${ub.book.title}」を本棚から削除しますか？\n(関連するすべてのメモも削除されます)`)) {
      const res = await deleteBookFromShelf(ub.id);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    }
  };

  const handleStartEditBookPrivacy = (ub: UserBookType) => {
    setEditingBookPrivacy(ub);
    setEditingBookPrivacyMode(ub.isPublic ? 'public' : (ub.groupShares && ub.groupShares.length > 0) ? 'group' : 'private');
    setEditingBookSelectedGroupIds(ub.groupShares?.map((gs) => gs.groupId) || []);
  };

  const handleSaveBookPrivacy = async () => {
    if (!editingBookPrivacy) return;
    setPrivacySaving(true);

    try {
      if ((editingBookPrivacyMode === 'public') !== editingBookPrivacy.isPublic) {
        await toggleBookPrivacy(editingBookPrivacy.id);
      }

      const gIds = editingBookPrivacyMode === 'group' ? editingBookSelectedGroupIds : [];
      const res = await shareBookToGroups(editingBookPrivacy.id, gIds);

      if (res?.error) {
        alert(res.error);
      } else {
        setEditingBookPrivacy(null);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      alert('公開範囲の保存中にエラーが発生しました。');
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleToggleNotePrivacy = async (noteId: string) => {
    const res = await toggleNotePrivacy(noteId);
    if (res?.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('このメモを削除しますか？')) {
      const res = await deleteInspirationNote(noteId);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Dashboard Header Banner */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '2rem',
          background: 'linear-gradient(to right, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.05))',
          borderColor: 'rgba(99, 102, 241, 0.2)',
        }}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', marginBottom: '0.25rem' }}>
            ようこそ、{username} さん
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            本日の読書インスピレーションを記録しましょう。
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button onClick={handleStartQuickNote} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--grad-cosmic)', border: 'none' }}>
              <MessageSquare size={16} />
              <span>クイックメモを書く</span>
            </button>
            <Link href="/add" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={16} />
              <span>本を追加</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: '登録した本', val: stats.total, icon: <BookIcon size={18} /> },
            { label: '読書中', val: stats.reading, icon: <BookOpen size={18} style={{ color: 'var(--color-primary)' }} /> },
            { label: '読了', val: stats.completed, icon: <CheckCircle size={18} style={{ color: 'var(--color-success)' }} /> },
            { label: 'メモ数', val: stats.notes, icon: <MessageSquare size={18} style={{ color: 'var(--color-secondary)' }} /> },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '0.75rem 1.25rem',
                minWidth: '110px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                {item.icon}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{item.val}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. INBOX / UNLINKED NOTES SECTION */}
      {unlinkedNotes.length > 0 && (
        <div className="glass-panel" style={{ background: 'rgba(6, 182, 212, 0.05)', borderColor: 'rgba(6, 182, 212, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Inbox size={20} style={{ color: 'var(--color-secondary)' }} />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: 0 }}>
              未分類のメモ / インボックス ({unlinkedNotes.length} 件)
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              ※ 本に紐付けることで、読書進捗や書籍ごとのハブに反映されます。
            </span>
          </div>

          <div className="inspiration-grid" style={{ marginTop: 0 }}>
            {unlinkedNotes.map((note) => (
              <div key={note.id} className={`inspiration-card card-theme-${note.cardStyle} animate-fade-in`} style={{ minHeight: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="card-tag" style={{ background: 'rgba(0,0,0,0.4)' }}>未分類</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleStartEditNote(note)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem', width: '26px', height: '26px', border: 'none', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                      title="本に関連付ける / 編集"
                    >
                      <LinkIcon size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem', width: '26px', height: '26px', border: 'none', background: 'rgba(0,0,0,0.3)', color: '#fda4af' }}
                      title="削除"
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

                <p className="card-quote" style={{ fontSize: '1.05rem' }}>{note.quote}</p>

                <div className="card-thought" style={{ background: 'rgba(0,0,0,0.4)', borderLeft: '3px solid var(--color-secondary)' }}>
                  <p style={{ margin: 0 }}>{note.thought}</p>
                </div>

                <div className="card-footer" style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => handleStartEditNote(note)}
                    style={{
                      background: 'var(--color-secondary)',
                      border: 'none',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <LinkIcon size={10} />
                    <span>本に関連付ける</span>
                  </button>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Shelf & Recent Thoughts Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* SECTION A: VIRTUAL SHELF */}
        <div className="glass-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              borderBottom: '1px solid var(--glass-border)',
              paddingBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookIcon size={22} style={{ color: 'var(--color-primary)' }} />
              <span>マイ本棚</span>
            </h2>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px' }}>
              {[
                { val: 'all', label: 'すべて' },
                { val: 'reading', label: '読書中' },
                { val: 'completed', label: '読了' },
                { val: 'wishlist', label: '読みたい' },
              ].map((t) => (
                <button
                  key={t.val}
                  className="btn"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    background: activeTab === t.val ? 'var(--color-primary)' : 'transparent',
                    color: activeTab === t.val ? 'white' : 'var(--text-secondary)',
                    borderRadius: '6px',
                  }}
                  onClick={() => setActiveTab(t.val as any)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <BookOpen size={48} style={{ strokeWidth: 1, color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p>表示する本がありません。</p>
              <Link href="/add" style={{ color: 'var(--color-primary)', fontSize: '0.9rem', marginTop: '0.5rem', display: 'inline-block' }}>
                新しい本を登録する
              </Link>
            </div>
          ) : (
            <div className="bookshelf-grid">
              {filteredBooks.map((ub) => {
                const percent = ub.book.pageCount ? Math.min(Math.round((ub.currentPage / ub.book.pageCount) * 100), 100) : 0;
                
                return (
                  <div key={ub.id} className="book-card animate-fade-in">
                    <div className="book-cover-wrapper" style={{ position: 'relative' }}>
                      <Link href={`/books/${ub.book.googleBooksId}`}>
                        {ub.book.coverUrl ? (
                          <img src={ub.book.coverUrl} alt={ub.book.title} className="book-cover-img" />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: '1rem' }}>
                            <BookIcon size={32} />
                          </div>
                        )}
                      </Link>

                      {/* Top Overlay Badge for Note Count */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(0,0,0,0.65)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          padding: '0.15rem 0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: 'var(--text-primary)',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          backdropFilter: 'blur(4px)',
                        }}
                        title={`${ub.inspirations.length}件のメモ`}
                      >
                        <MessageSquare size={10} style={{ color: 'var(--color-secondary)' }} />
                        <span>{ub.inspirations.length}</span>
                      </div>

                      {/* Top Overlay Badge for Privacy */}
                      <button
                        onClick={() => handleStartEditBookPrivacy(ub)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.65)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: ub.isPublic
                            ? 'var(--color-secondary)'
                            : (ub.groupShares && ub.groupShares.length > 0)
                            ? 'var(--color-primary)'
                            : 'var(--text-secondary)',
                          cursor: 'pointer',
                          backdropFilter: 'blur(4px)',
                        }}
                        title={
                          ub.isPublic
                            ? '全体公開中 (クリックして変更)'
                            : (ub.groupShares && ub.groupShares.length > 0)
                            ? 'グループ限定公開中 (クリックして変更)'
                            : '非公開 (クリックして変更)'
                        }
                      >
                        {ub.isPublic ? (
                          <Globe size={14} />
                        ) : (ub.groupShares && ub.groupShares.length > 0) ? (
                          <Users size={14} />
                        ) : (
                          <Lock size={14} />
                        )}
                      </button>

                      {/* Progress Line */}
                      {ub.status !== 'wishlist' && ub.book.pageCount && (
                        <div className="book-progress-bar-container" title={`進捗: ${percent}% (${ub.currentPage}/${ub.book.pageCount}p)`}>
                          <div className="book-progress-bar" style={{ width: `${percent}%` }} />
                        </div>
                      )}
                    </div>

                    <Link href={`/books/${ub.book.googleBooksId}`} className="book-title" title={ub.book.title}>
                      {ub.book.title}
                    </Link>
                    <div className="book-author" title={ub.book.author}>{ub.book.author}</div>

                    {/* Dashboard Controls for Book */}
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {/* Reading Progress Selector */}
                      {ub.status === 'reading' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {editingProgressId === ub.id ? (
                            <div style={{ display: 'flex', width: '100%', gap: '0.25rem' }}>
                              <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '28px', textAlign: 'center' }}
                                value={progressValue}
                                max={ub.book.pageCount || 9999}
                                min={0}
                                onChange={(e) => setProgressValue(Number(e.target.value))}
                                disabled={progressSaving}
                              />
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: '28px' }}
                                onClick={() => handleSaveProgress(ub)}
                                disabled={progressSaving}
                              >
                                保存
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditProgress(ub)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                padding: '0.3rem 0.5rem',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              <span>進捗: {percent}%</span>
                              <span style={{ textDecoration: 'underline' }}>更新</span>
                            </button>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => handleStartBookNote(ub)}
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem', height: '28px' }}
                        >
                          メモする
                        </button>
                        <button
                          onClick={() => handleDeleteBook(ub)}
                          className="btn btn-danger"
                          style={{ padding: '0.35rem', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="本棚から削除"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION B: RECENT INSPIRATIONS */}
        <div className="glass-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              borderBottom: '1px solid var(--glass-border)',
              paddingBottom: '0.75rem',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={22} style={{ color: 'var(--color-secondary)' }} />
              <span>最近のインスピレーションメモ ({linkedNotes.length} 件)</span>
            </h2>
            <Link href="/canvas" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>マインドキャンバスで一覧表示</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {linkedNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ strokeWidth: 1, color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p>まだ本に関連付けられたメモがありません。本棚の「メモする」ボタンから読書インスピレーションを保存しましょう！</p>
            </div>
          ) : (
            <div className="inspiration-grid">
              {linkedNotes.slice(0, 6).map((note) => (
                <div key={note.id} className={`inspiration-card card-theme-${note.cardStyle} animate-fade-in`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="card-tag">{note.tag}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleStartEditNote(note)}
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="編集"
                      >
                        <Edit2 size={11} />
                      </button>
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
          )}
        </div>
      </div>

      {/* 4. INSPIRATION NOTE DRAWER (Modal Dialog) */}
      {isNoteDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsNoteDrawerOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '550px',
              height: '100%',
              borderRadius: 0,
              borderTop: 'none',
              borderBottom: 'none',
              borderRight: 'none',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              padding: '2rem',
              background: 'var(--bg-secondary)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              animation: 'fadeIn 0.25s ease forwards',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} style={{ color: 'var(--color-primary)' }} />
                <span>
                  {isEditingNote ? 'メモを編集' : 'ひらめきをメモ'}
                </span>
              </h3>
              <button
                onClick={() => setIsNoteDrawerOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  color: '#fda4af',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flexGrow: 1 }}>
              
              {/* Dynamic Book Linker Dropdown */}
              <div className="form-group">
                <label htmlFor="noteBookLink">書籍との関連付け</label>
                <select
                  id="noteBookLink"
                  className="input-field"
                  value={selectedBookIdForNote || ''}
                  onChange={(e) => setSelectedBookIdForNote(e.target.value || null)}
                  disabled={noteSaving}
                  style={{ background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
                >
                  <option value="">（関連付けなし - あとで本棚から紐付け）</option>
                  {initialBooks.map((ub) => (
                    <option key={ub.id} value={ub.id}>
                      📖 {ub.book.title} ({ub.book.author})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  ※ まだ本棚にない書籍に関連付けたい場合は、先に本棚へ追加してください。
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="quote">本からの引用文 (心に残った箇所・一文)*</label>
                <textarea
                  id="quote"
                  className="input-field"
                  style={{ height: '80px', resize: 'vertical' }}
                  placeholder="本の中の印象的なフレーズや引用文を記入してください。思いつきのメモの場合は仮の言葉でも構いません。"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  required
                  disabled={noteSaving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="prompt">思考のヒント（プロンプトの選択）</label>
                <select
                  id="prompt"
                  className="input-field"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={noteSaving}
                  style={{ background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
                >
                  <option value="">（選択しない - 自由に記入）</option>
                  {reflectionPrompts.map((p, idx) => (
                    <option key={idx} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="thought">インスピレーション・考察・思考メモ*</label>
                <textarea
                  id="thought"
                  className="input-field"
                  style={{ height: '120px', resize: 'vertical' }}
                  placeholder="引用に対して感じたこと、自分の体験、明日からどう活かすかなど、あなたのインスピレーションを綴ってください。"
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  required
                  disabled={noteSaving}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="chapter">章・セクション名</label>
                  <input
                    id="chapter"
                    type="text"
                    className="input-field"
                    placeholder="例: 第1章, プロローグ"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    disabled={noteSaving}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="page">参照ページ</label>
                  <input
                    id="page"
                    type="number"
                    className="input-field"
                    placeholder="例: 142"
                    value={page}
                    onChange={(e) => setPage(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={noteSaving}
                  />
                </div>
              </div>

              {/* Image attachment with Camera support & OCR */}
              <div className="form-group">
                <label>引用する画像 (本の一節をカメラ撮影 / 画像を選択)</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    id="imageFileInput"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    disabled={noteSaving}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => document.getElementById('imageFileInput')?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    disabled={noteSaving}
                  >
                    <Camera size={14} />
                    <span>画像を選択 / 撮影</span>
                  </button>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="または画像URLを直接入力"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ flex: 1, minWidth: '150px', fontSize: '0.8rem', padding: '0.45rem 0.6rem' }}
                    disabled={noteSaving}
                  />
                </div>

                {imageUrl && (
                  <div style={{ marginTop: '0.75rem', position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px dashed var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem' }}>
                    <img src={imageUrl} alt="Quote Preview" style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', display: 'block', borderRadius: '4px' }} />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="画像を削除"
                    >
                      <X size={14} />
                    </button>
                    
                    {/* OCR action button inside preview */}
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleExtractText}
                        disabled={ocrLoading || noteSaving}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.35rem 0.75rem',
                          background: 'var(--grad-emerald)',
                          border: 'none',
                          boxShadow: 'none',
                          width: '100%'
                        }}
                      >
                        {ocrLoading ? `文字を読取中... ${ocrProgress}%` : '✨ 画像からテキストを読み取って引用にコピー'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="tag">メモの種類 (分類タグ)</label>
                  <select
                    id="tag"
                    className="input-field"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    disabled={noteSaving}
                  >
                    <option value="Idea">💡 アイデア (Idea)</option>
                    <option value="Actionable">🚀 行動すること (Action)</option>
                    <option value="Quote">💬 印象的な言葉 (Quote)</option>
                    <option value="Question">❓ 問い・疑問 (Question)</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="cardStyle">背景デザイン</label>
                  <select
                    id="cardStyle"
                    className="input-field"
                    value={cardStyle}
                    onChange={(e) => setCardStyle(e.target.value)}
                    disabled={noteSaving}
                  >
                    <option value="gradient-violet">🔮 ヴァイオレット (宇宙)</option>
                    <option value="gradient-rose">🌸 ローズ (華やか)</option>
                    <option value="gradient-emerald">🌲 エメラルド (知性)</option>
                    <option value="gradient-sunset">🌅 サンセット (情熱)</option>
                    <option value="gradient-cosmic">🌌 コズミック (深海)</option>
                    <option value="gradient-dark">🖤 チャコール (シック)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>公開範囲 (プライバシー設定)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  {[
                    { val: 'private', label: '🔒 非公開', desc: '自分のみ' },
                    { val: 'group', label: '👥 限定公開', desc: 'グループのみ' },
                    { val: 'public', label: '🌐 全体公開', desc: 'コミュニティ' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      className={`btn ${notePrivacyMode === opt.val ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, minWidth: '90px', padding: '0.4rem 0.25rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', height: 'auto', gap: '0.1rem' }}
                      onClick={() => setNotePrivacyMode(opt.val as any)}
                      disabled={noteSaving}
                    >
                      <span style={{ fontWeight: 'bold' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>{opt.desc}</span>
                    </button>
                  ))}
                </div>

                {notePrivacyMode === 'group' && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>共有するグループを選択:</div>
                    {myGroups.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>参加しているグループがありません。</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {myGroups.map((group) => {
                          const checked = noteSelectedGroupIds.includes(group.id);
                          return (
                            <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNoteSelectedGroupIds([...noteSelectedGroupIds, group.id]);
                                  } else {
                                    setNoteSelectedGroupIds(noteSelectedGroupIds.filter((id) => id !== group.id));
                                  }
                                }}
                                disabled={noteSaving}
                              />
                              <span>{group.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '1rem' }}
                disabled={noteSaving}
              >
                {noteSaving ? '保存中...' : isEditingNote ? '更新する' : 'インスピレーションを保存'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- BOOK PRIVACY MODAL --- */}
      {editingBookPrivacy && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', position: 'relative', animation: 'scale-up 0.2s ease-out' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              🔒 公開範囲の変更
            </h2>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>対象書籍</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{editingBookPrivacy.book.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>著者: {editingBookPrivacy.book.author}</div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>公開範囲</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { val: 'private', label: '🔒 非公開', desc: '自分のみ' },
                  { val: 'group', label: '👥 限定公開', desc: 'グループのみ' },
                  { val: 'public', label: '🌐 全体公開', desc: 'コミュニティ' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    className={`btn ${editingBookPrivacyMode === opt.val ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minWidth: '90px', padding: '0.4rem 0.25rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', height: 'auto', gap: '0.1rem' }}
                    onClick={() => setEditingBookPrivacyMode(opt.val as any)}
                    disabled={privacySaving}
                  >
                    <span style={{ fontWeight: 'bold' }}>{opt.label}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>{opt.desc}</span>
                  </button>
                ))}
              </div>

              {editingBookPrivacyMode === 'group' && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>共有するグループを選択:</div>
                  {myGroups.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>参加しているグループがありません。</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {myGroups.map((group) => {
                        const checked = editingBookSelectedGroupIds.includes(group.id);
                        return (
                          <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditingBookSelectedGroupIds([...editingBookSelectedGroupIds, group.id]);
                                } else {
                                  setEditingBookSelectedGroupIds(editingBookSelectedGroupIds.filter((id) => id !== group.id));
                                }
                              }}
                              disabled={privacySaving}
                            />
                            <span>{group.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setEditingBookPrivacy(null)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                disabled={privacySaving}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveBookPrivacy}
                className="btn btn-primary"
                style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                disabled={privacySaving}
              >
                {privacySaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>設定を保存</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
