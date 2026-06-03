'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Book as BookIcon,
  User,
  Bookmark,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Edit2,
  CheckCircle,
  Clock,
  Sparkles,
  MessageSquare,
  X,
  Camera,
  Lock,
  Globe,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import {
  updateReadingProgress,
  createInspirationNote,
  deleteInspirationNote,
  toggleNotePrivacy,
} from '@/app/actions';

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
  userId: string;
  user: {
    name: string | null;
    username: string | null;
  };
}

interface BookHubClientProps {
  book: {
    id: string;
    googleBooksId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    description: string | null;
    pageCount: number | null;
  };
  currentUserBook: {
    id: string;
    currentPage: number;
    status: string;
    isPublic: boolean;
  } | null;
  readers: {
    id: string;
    user: {
      name: string | null;
      username: string | null;
    };
  }[];
  allNotes: NoteType[];
  currentUserId: string | null;
}

export default function BookHubClient({
  book,
  currentUserBook,
  readers,
  allNotes,
  currentUserId,
}: BookHubClientProps) {
  const router = useRouter();
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);

  // Note fields
  const [quote, setQuote] = useState('');
  const [thought, setThought] = useState('');
  const [page, setPage] = useState<number | ''>('');
  const [chapter, setChapter] = useState('');
  const [prompt, setPrompt] = useState('');
  const [tag, setTag] = useState('Idea');
  const [cardStyle, setCardStyle] = useState('gradient-violet');
  const [noteIsPublic, setNoteIsPublic] = useState(currentUserBook?.isPublic || false);
  const [imageUrl, setImageUrl] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

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

  // Progress fields
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(currentUserBook?.currentPage || 0);
  const [progressSaving, setProgressSaving] = useState(false);

  const [error, setError] = useState('');

  // Divide notes into "My Notes" and "Others' Notes"
  const myNotes = allNotes.filter((n) => n.userId === currentUserId);
  const otherNotes = allNotes.filter((n) => n.userId !== currentUserId);

  const reflectionPrompts = [
    'この内容を自分の生活やアクションにどう反映するか？',
    '著者のこの見解に対する別の視点や反対意見はあるか？',
    'このインスピレーションからどんな新しいアイデアが生まれた？',
    '他の本や知見との共通点や結びつきはあるか？',
    '今の自分にとって、この言葉が響いた理由は何だろう？',
  ];

  const handleSaveProgress = async () => {
    if (!currentUserBook) return;
    setProgressSaving(true);
    const res = await updateReadingProgress(
      currentUserBook.id,
      progressValue,
      currentUserBook.status
    );
    if (res?.error) {
      alert(res.error);
    } else {
      setIsEditingProgress(false);
      router.refresh();
    }
    setProgressSaving(false);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserBook || !quote.trim() || !thought.trim()) return;

    setNoteSaving(true);
    setError('');

    const res = await createInspirationNote({
      userBookId: currentUserBook.id,
      quote,
      thought,
      page: page !== '' ? Number(page) : null,
      chapter: chapter.trim() || null,
      prompt: prompt || null,
      imageUrl: imageUrl.trim() || null,
      tag,
      cardStyle,
      isPublic: noteIsPublic,
    });

    if (res?.error) {
      setError(res.error);
      setNoteSaving(false);
    } else {
      setQuote('');
      setThought('');
      setPage('');
      setChapter('');
      setPrompt('');
      setImageUrl('');
      setShowAddNoteForm(false);
      setNoteSaving(false);
      router.refresh();
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

  const cleanDescription = book.description
    ? book.description.replace(/<\/?[^>]+(>|$)/g, '')
    : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Back button */}
      <div>
        <Link
          href={currentUserId ? '/dashboard' : '/explore'}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={14} />
          <span>{currentUserId ? '本棚に戻る' : '広場に戻る'}</span>
        </Link>
      </div>

      {/* Book Metadata Cover Banner */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          background: 'linear-gradient(to right, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
        }}
      >
        <div
          style={{
            width: '140px',
            height: '210px',
            background: 'var(--bg-tertiary)',
            borderRadius: '10px',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <BookIcon size={48} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.25rem', lineHeight: 1.25 }}>
            {book.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>
            著者: <Link href={`/authors/${encodeURIComponent(book.author)}`} style={{ textDecoration: 'underline' }}>{book.author}</Link>
          </p>
          {book.pageCount && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              総ページ数: {book.pageCount} p
            </p>
          )}
          {cleanDescription && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={cleanDescription}>
                {cleanDescription}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Personal Workspace Panel (Visible if book is on user's shelf) */}
      {currentUserBook && (
        <div
          className="glass-panel"
          style={{
            background: 'rgba(99, 102, 241, 0.05)',
            borderColor: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>
                あなたの読書ステータス
              </h3>
            </div>
            
            <button
              onClick={() => setShowAddNoteForm(!showAddNoteForm)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>この本にメモを書く</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '10px' }}>
            {/* Status */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>状況</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                {currentUserBook.status === 'reading' ? '📖 読書中' : currentUserBook.status === 'completed' ? '✅ 読了' : '⏳ 積読'}
              </div>
            </div>

            {/* Reading Progress Selector */}
            {currentUserBook.status === 'reading' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>読書進捗</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                  {isEditingProgress ? (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <input
                        type="number"
                        className="input-field"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: '80px', height: '30px' }}
                        value={progressValue}
                        max={book.pageCount || 9999}
                        min={0}
                        onChange={(e) => setProgressValue(Number(e.target.value))}
                        disabled={progressSaving}
                      />
                      <button onClick={handleSaveProgress} disabled={progressSaving} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', height: '30px', fontSize: '0.75rem' }}>
                        保存
                      </button>
                      <button onClick={() => setIsEditingProgress(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', height: '30px', fontSize: '0.75rem' }}>
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        {progressValue} / {book.pageCount || '?'} ページ
                        {book.pageCount && ` (${Math.min(Math.round((progressValue / book.pageCount) * 100), 100)}%)`}
                      </span>
                      <button onClick={() => setIsEditingProgress(true)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '26px' }}>
                        更新
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Note counts */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>あなたのメモ数</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                {myNotes.length} 件 (公開: {myNotes.filter(n => n.isPublic).length} / 非公開: {myNotes.filter(n => !n.isPublic).length})
              </div>
            </div>
          </div>

          {/* Add Note Form inside panel */}
          {showAddNoteForm && (
            <div className="glass-panel animate-fade-in" style={{ background: 'var(--bg-secondary)', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontWeight: 600 }}>新しいインスピレーション・メモを追加</h4>
                <button onClick={() => setShowAddNoteForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {error && (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#fda4af', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="quote">本からの引用文 (心に残った箇所・一文)*</label>
                  <textarea
                    id="quote"
                    className="input-field"
                    style={{ height: '70px', resize: 'vertical' }}
                    placeholder="本の中の印象的なフレーズや引用文を記入してください。"
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
                    style={{ background: 'rgba(0,0,0,0.3)' }}
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
                  <label htmlFor="thought">考察・思考メモ*</label>
                  <textarea
                    id="thought"
                    className="input-field"
                    style={{ height: '100px', resize: 'vertical' }}
                    placeholder="引用に対して感じたこと、応用プランなどを綴ってください。"
                    value={thought}
                    onChange={(e) => setThought(e.target.value)}
                    required
                    disabled={noteSaving}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="chapter">章・見出し</label>
                    <input
                      id="chapter"
                      type="text"
                      className="input-field"
                      placeholder="例: 第2章"
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
                      placeholder="例: 92"
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
                    <label htmlFor="tag">分類タグ</label>
                    <select id="tag" className="input-field" value={tag} onChange={(e) => setTag(e.target.value)} disabled={noteSaving}>
                      <option value="Idea">💡 アイデア (Idea)</option>
                      <option value="Actionable">🚀 行動すること (Action)</option>
                      <option value="Quote">💬 印象的な言葉 (Quote)</option>
                      <option value="Question">❓ 問い・疑問 (Question)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="cardStyle">背景デザイン</label>
                    <select id="cardStyle" className="input-field" value={cardStyle} onChange={(e) => setCardStyle(e.target.value)} disabled={noteSaving}>
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
                  <label>プライバシー設定</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      className={`btn ${!noteIsPublic ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                      onClick={() => setNoteIsPublic(false)}
                      disabled={noteSaving}
                    >
                      <Lock size={14} style={{ marginRight: '0.25rem' }} />
                      <span>自分のみ (Private)</span>
                    </button>
                    <button
                      type="button"
                      className={`btn ${noteIsPublic ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                      onClick={() => setNoteIsPublic(true)}
                      disabled={noteSaving}
                    >
                      <Globe size={14} style={{ marginRight: '0.25rem' }} />
                      <span>全体に公開 (Public)</span>
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.7rem' }} disabled={noteSaving}>
                  {noteSaving ? '保存中...' : 'インスピレーションを保存'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 3. Book Hub Contents Layout: Readers & Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
        
        {/* MY NOTES GRID (If user has notes for this book) */}
        {currentUserBook && myNotes.length > 0 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bookmark size={22} style={{ color: 'var(--color-primary)' }} />
              <span>あなたのメモ ({myNotes.length} 件)</span>
            </h2>

            <div className="inspiration-grid">
              {myNotes.map((note) => (
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

                  <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
                    <span>
                      {note.chapter ? `${note.chapter} ` : ''}
                      {note.page ? `${note.page}p` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PUBLIC NOTES GRID (Other readers' quotes) */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={22} style={{ color: 'var(--color-secondary)' }} />
            <span>他の読書家たちのインスピレーション ({otherNotes.length} 件)</span>
          </h2>

          {otherNotes.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <Bookmark size={32} style={{ strokeWidth: 1.5, color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p>他の読書家からの公開メモはまだありません。</p>
            </div>
          ) : (
            <div className="inspiration-grid">
              {otherNotes.map((note) => (
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

                  <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
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

        {/* Readers List */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--color-primary)' }} />
            <span>この本を公開登録している読者 ({readers.length}名)</span>
          </h3>

          {readers.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              この本を公開設定で登録しているユーザーはまだいません。
            </p>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {readers.map((r) => (
                <Link
                  key={r.id}
                  href={`/users/${r.user.username || r.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s ease',
                  }}
                  className="glass-panel-hover"
                >
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--grad-cosmic)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'white', fontWeight: 'bold' }}>
                    {r.user.name ? r.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span>@{r.user.name || r.user.username}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
