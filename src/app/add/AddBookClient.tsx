'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Book, Plus, Eye, EyeOff, Loader2, ArrowLeft, Users } from 'lucide-react';
import { addBookToShelf, searchBooks, getExistingAuthors, getGroups } from '@/app/actions';

interface GoogleBookItem {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
    };
  };
}

export default function AddBookClient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBook, setSelectedBook] = useState<GoogleBookItem | null>(null);

  // Adding state options
  const [status, setStatus] = useState('reading');
  const [privacyMode, setPrivacyMode] = useState<'private' | 'group' | 'public'>('private');
  const [adding, setAdding] = useState(false);

  // Manual Mode states
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualPageCount, setManualPageCount] = useState<number | ''>('');

  // Fetch unique authors in database for manual mode autocomplete suggestions
  const [existingAuthors, setExistingAuthors] = useState<string[]>([]);

  // Reading groups state
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (isManualMode) {
      getExistingAuthors().then((authors) => {
        setExistingAuthors(authors);
      });
    }
  }, [isManualMode]);

  useEffect(() => {
    getGroups().then((groupsList) => {
      setMyGroups(groupsList);
    });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setSelectedBook(null);

    try {
      const res = await searchBooks(query);
      if (res.error) {
        setError(res.error);
        setResults([]);
      } else {
        const items = res.items || [];
        setResults(items);
        if (items.length === 0) {
          setError('本が見つかりませんでした。キーワードを変えて試してください。');
        }
      }
    } catch (err: any) {
      setError('検索エラーが発生しました。接続をご確認ください。');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBook = (book: GoogleBookItem) => {
    setSelectedBook(book);
    setStatus('reading');
    setPrivacyMode('private');
    setSelectedGroupIds([]);
  };

  const handleAddBook = async () => {
    if (!selectedBook) return;

    setAdding(true);
    setError('');

    const info = selectedBook.volumeInfo;
    const bookData = {
      googleBooksId: selectedBook.id,
      title: info.title,
      author: info.authors ? info.authors.join(', ') : '不明な著者',
      coverUrl: info.imageLinks?.thumbnail ? info.imageLinks.thumbnail.replace('http://', 'https://') : null,
      description: info.description || null,
      pageCount: info.pageCount || null,
      status,
      isPublic: privacyMode === 'public',
      groupIds: privacyMode === 'group' ? selectedGroupIds : [],
    };

    try {
      const res = await addBookToShelf(bookData);
      
      if (res?.error) {
        setError(res.error);
        setAdding(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('本の追加中にエラーが発生しました。');
      setAdding(false);
    }
  };

  const handleAddManualBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    setAdding(true);
    setError('');

    // Unique client ID prefixed with manual- to ensure database uniqueness
    const uniqueId = 'manual-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();

    const bookData = {
      googleBooksId: uniqueId,
      title: manualTitle.trim(),
      author: manualAuthor.trim() || '不明な著者',
      coverUrl: manualCoverUrl.trim() || null,
      description: manualDescription.trim() || null,
      pageCount: manualPageCount !== '' ? Number(manualPageCount) : null,
      status,
      isPublic: privacyMode === 'public',
      groupIds: privacyMode === 'group' ? selectedGroupIds : [],
    };

    try {
      const res = await addBookToShelf(bookData);
      
      if (res?.error) {
        setError(res.error);
        setAdding(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('手動での本の追加中にエラーが発生しました。');
      setAdding(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>本棚に本を追加</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Google Booksから本を探して、自分の本棚に登録します。</p>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            color: '#fda4af',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Mode Choice */}
      {isManualMode ? (
        /* Manual registration form */
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px' }}>
            <button
              type="button"
              onClick={() => {
                setIsManualMode(false);
                setError('');
              }}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem' }}
            >
              <ArrowLeft size={14} />
              <span>検索モードに戻る</span>
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              ✍️ 本を手動で登録
            </h2>

            <form onSubmit={handleAddManualBook} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="manualTitle">書籍タイトル*</label>
                <input
                  id="manualTitle"
                  type="text"
                  className="input-field"
                  placeholder="例: アルケミスト"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  required
                  disabled={adding}
                />
              </div>

              <div className="form-group">
                <label htmlFor="manualAuthor">著者名</label>
                <input
                  id="manualAuthor"
                  type="text"
                  className="input-field"
                  placeholder="例: パウロ・コエーリョ"
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
                  disabled={adding}
                  list="existing-authors-list"
                  autoComplete="off"
                />
                <datalist id="existing-authors-list">
                  {existingAuthors.map((author) => (
                    <option key={author} value={author} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label htmlFor="manualCoverUrl">表紙画像 URL (任意)</label>
                <input
                  id="manualCoverUrl"
                  type="url"
                  className="input-field"
                  placeholder="https://example.com/cover.jpg (空欄でもデフォルト画像が設定されます)"
                  value={manualCoverUrl}
                  onChange={(e) => setManualCoverUrl(e.target.value)}
                  disabled={adding}
                />
              </div>

              <div className="form-group">
                <label htmlFor="manualPageCount">総ページ数 (任意)</label>
                <input
                  id="manualPageCount"
                  type="number"
                  className="input-field"
                  placeholder="例: 200"
                  value={manualPageCount}
                  onChange={(e) => setManualPageCount(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={adding}
                />
              </div>

              <div className="form-group">
                <label htmlFor="manualDescription">本の説明・あらすじ (任意)</label>
                <textarea
                  id="manualDescription"
                  className="input-field"
                  style={{ height: '80px', resize: 'vertical' }}
                  placeholder="本の内容や読書動機を自由にメモできます。"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  disabled={adding}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--glass-border)', padding: '1.25rem 0 0.5rem 0' }}>
                <div className="form-group">
                  <label>読書状況</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { val: 'reading', label: '現在読んでいる本' },
                      { val: 'completed', label: '読了した本' },
                      { val: 'wishlist', label: '読みたい本 (積読など)' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        className={`btn ${status === opt.val ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, minWidth: '100px', padding: '0.5rem', fontSize: '0.85rem' }}
                        onClick={() => setStatus(opt.val)}
                        disabled={adding}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>公開範囲 (プライバシー設定)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { val: 'private', label: '🔒 非公開', desc: '自分のみ' },
                      { val: 'group', label: '👥 限定公開', desc: 'グループのみ' },
                      { val: 'public', label: '🌐 全体公開', desc: 'コミュニティ' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        className={`btn ${privacyMode === opt.val ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, minWidth: '100px', padding: '0.4rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', height: 'auto', gap: '0.1rem' }}
                        onClick={() => setPrivacyMode(opt.val as any)}
                        disabled={adding}
                      >
                        <span style={{ fontWeight: 'bold' }}>{opt.label}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {privacyMode === 'group' && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>共有するグループを選択:</div>
                      {myGroups.length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>参加しているグループがありません。</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {myGroups.map((group) => {
                            const checked = selectedGroupIds.includes(group.id);
                            return (
                              <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedGroupIds([...selectedGroupIds, group.id]);
                                    } else {
                                      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id));
                                    }
                                  }}
                                  disabled={adding}
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
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}
                disabled={adding}
              >
                {adding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                <span>本棚に追加する</span>
              </button>
            </form>
          </div>
        </div>
      ) : !selectedBook ? (
        /* Mode 1: Search Form & Results */
        <div>
          {/* Manual Entry Toggle Banner */}
          <div
            className="glass-panel"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'rgba(255,255,255,0.01)',
              padding: '1rem 1.5rem',
              borderColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              お探しの本が見つからない、またはAPI制限エラーですか？
            </span>
            <button
              type="button"
              onClick={() => {
                setIsManualMode(true);
                setError('');
              }}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', borderColor: 'var(--color-primary)' }}
            >
              ✍️ 手動で本を登録する
            </button>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '2.75rem', fontSize: '1rem' }}
                placeholder="本のタイトル、著者名、キーワードなどを入力..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '100px' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : '検索'}
            </button>
          </form>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '4rem 0' }}>
              <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          )}

          {/* Results Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {results.map((item) => {
              const info = item.volumeInfo;
              const cover = info.imageLinks?.thumbnail;
              const authors = info.authors ? info.authors.join(', ') : '著者不明';
              
              return (
                <div
                  key={item.id}
                  className="glass-panel glass-panel-hover"
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => handleSelectBook(item)}
                >
                  <div
                    style={{
                      width: '70px',
                      height: '100px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {cover ? (
                      <img src={cover.replace('http://', 'https://')} alt={info.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                        <Book size={24} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <h3
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        margin: 0,
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {info.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        margin: '0.25rem 0 0.5rem 0',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {authors}
                    </p>
                    {info.pageCount && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
                        {info.pageCount} ページ
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Mode 2: Adding Options Settings */
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px' }}>
            <button
              onClick={() => setSelectedBook(null)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem' }}
            >
              <ArrowLeft size={14} />
              <span>検索結果に戻る</span>
            </button>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
              <div
                style={{
                  width: '100px',
                  height: '150px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {selectedBook.volumeInfo.imageLinks?.thumbnail ? (
                  <img
                    src={selectedBook.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://')}
                    alt={selectedBook.volumeInfo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    <Book size={32} />
                  </div>
                )}
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {selectedBook.volumeInfo.title}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  著者: {selectedBook.volumeInfo.authors ? selectedBook.volumeInfo.authors.join(', ') : '不明な著者'}
                </p>
                {selectedBook.volumeInfo.pageCount && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    ページ数: {selectedBook.volumeInfo.pageCount} ページ
                  </p>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', padding: '1.5rem 0' }}>
              <div className="form-group">
                <label>読書状況</label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {[
                    { val: 'reading', label: '現在読んでいる本' },
                    { val: 'completed', label: '読了した本' },
                    { val: 'wishlist', label: '読みたい本 (積読など)' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      className={`btn ${status === opt.val ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}
                      onClick={() => setStatus(opt.val)}
                      disabled={adding}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label>公開範囲 (プライバシー設定)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { val: 'private', label: '🔒 非公開', desc: '自分のみ' },
                    { val: 'group', label: '👥 限定公開', desc: 'グループのみ' },
                    { val: 'public', label: '🌐 全体公開', desc: 'コミュニティ' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      className={`btn ${privacyMode === opt.val ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, minWidth: '100px', padding: '0.4rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', height: 'auto', gap: '0.1rem' }}
                      onClick={() => setPrivacyMode(opt.val as any)}
                      disabled={adding}
                    >
                      <span style={{ fontWeight: 'bold' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{opt.desc}</span>
                    </button>
                  ))}
                </div>

                {privacyMode === 'group' && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>共有するグループを選択:</div>
                    {myGroups.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>参加しているグループがありません。</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {myGroups.map((group) => {
                          const checked = selectedGroupIds.includes(group.id);
                          return (
                            <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGroupIds([...selectedGroupIds, group.id]);
                                  } else {
                                    setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id));
                                  }
                                }}
                                disabled={adding}
                              />
                              <span>{group.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                  ※ 全体公開に設定すると、コミュニティ広場のタイムラインや、あなたの公開プロファイルページに本棚が表示され、他の読書家から本や読了状況が見えるようになります。
                </p>
              </div>
            </div>

            <button
              onClick={handleAddBook}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={adding}
            >
              {adding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              <span>本棚に追加する</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
