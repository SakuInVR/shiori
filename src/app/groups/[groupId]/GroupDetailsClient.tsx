'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Book, Clock, Clipboard, ClipboardCheck, Plus, Check, Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { addBookToGroup } from '@/app/actions';

interface BookItem {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  googleBooksId: string;
}

interface MemberProgress {
  userId: string;
  name: string;
  currentPage: number;
  pageCount: number | null;
  status: string;
  updatedAt: Date;
}

interface GroupBookItem {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  pageCount: number | null;
  googleBooksId: string;
  progress: MemberProgress[];
}

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  role: string;
  joinedAt: Date;
}

interface NoteItem {
  id: string;
  userId: string;
  quote: string;
  thought: string;
  page: number | null;
  chapter: string | null;
  prompt: string | null;
  imageUrl: string | null;
  tag: string;
  cardStyle: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    username: string | null;
  };
  userBook?: {
    book: {
      title: string;
      author: string;
    };
  } | null;
}

interface GroupDetails {
  group: {
    id: string;
    name: string;
    description: string | null;
    inviteCode: string;
    createdById: string;
    createdAt: Date;
  };
  members: MemberItem[];
  books: GroupBookItem[];
  notes: any[]; // NoteItem[]
  role: string;
}

export default function GroupDetailsClient({
  groupId,
  initialDetails,
  userBooks,
  currentUserId,
}: {
  groupId: string;
  initialDetails: GroupDetails;
  userBooks: BookItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [details, setDetails] = useState<GroupDetails>(initialDetails);
  const [activeTab, setActiveTab] = useState<'timeline' | 'books' | 'members'>('timeline');
  const [copied, setCopied] = useState(false);
  
  // Add Book Dialog states
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [addingBook, setAddingBook] = useState(false);
  const [addBookError, setAddBookError] = useState('');

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(details.group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddBookToGroup = async () => {
    if (!selectedBookId) return;
    setAddingBook(true);
    setAddBookError('');

    try {
      const res = await addBookToGroup(groupId, selectedBookId);
      if (res.error) {
        setAddBookError(res.error);
      } else {
        setShowAddBookModal(false);
        setSelectedBookId('');
        router.refresh();
        // Dynamically fetch details again or reload
        window.location.reload();
      }
    } catch (err) {
      setAddBookError('グループへの追加中にエラーが発生しました。');
    } finally {
      setAddingBook(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', label: '読了' };
      case 'wishlist':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', label: '読みたい本' };
      default:
        return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', label: '読書中' };
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Back button */}
      <button
        onClick={() => router.push('/groups')}
        className="btn btn-secondary"
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={14} />
        <span>グループ一覧に戻る</span>
      </button>

      {/* Group Header */}
      <div className="glass-panel" style={{ marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={20} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>読書サークル</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', marginBottom: '0.75rem', lineHeight: 1.2 }}>
              {details.group.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '800px' }}>
              {details.group.description || 'このグループの説明はありません。'}
            </p>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '1rem',
              minWidth: '220px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>招待コード</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.05em' }}>
                {details.group.inviteCode}
              </span>
              <button
                onClick={handleCopyInvite}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? 'var(--color-success)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="コードをコピー"
              >
                {copied ? <ClipboardCheck size={18} /> : <Clipboard size={18} />}
              </button>
            </div>
            {copied && <div style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>クリップボードにコピーしました！</div>}
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem', gap: '1.5rem' }}>
        {[
          { id: 'timeline', label: '読書タイムライン', icon: Clock },
          { id: 'books', label: 'グループ本棚', icon: Book },
          { id: 'members', label: 'メンバー一覧', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'none',
                border: 'none',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                paddingBottom: '0.75rem',
                borderBottom: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.95rem',
                fontWeight: isSelected ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB CONTENT 1: TIMELINE --- */}
      {activeTab === 'timeline' && (
        <div className="animate-fade-in">
          {details.notes.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <Clock size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>共有されたメモはありません</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                本棚の書籍やノートのプライバシー設定で「グループ限定公開」を選び、このグループを選択するとここに表示されます。
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {details.notes.map((note: NoteItem) => {
                return (
                  <div
                    key={note.id}
                    className="glass-panel"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      background: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      position: 'relative',
                    }}
                  >
                    {/* User and date info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--grad-cosmic)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: 'white',
                          }}
                        >
                          {note.user.name ? note.user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {note.user.name || note.user.username}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(note.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>

                    {/* Note Tag & Chapter */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.7rem',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        {note.tag}
                      </span>
                      {(note.page || note.chapter) && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {note.chapter && `${note.chapter} `}
                          {note.page && `${note.page}p`}
                        </span>
                      )}
                    </div>

                    {/* Polaroid Image Render if present */}
                    {note.imageUrl && (
                      <div
                        style={{
                          background: 'white',
                          padding: '8px 8px 24px 8px',
                          borderRadius: '4px',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                          transform: 'rotate(-1.5deg)',
                          marginBottom: '1rem',
                        }}
                      >
                        <img
                          src={note.imageUrl}
                          alt="Captured visual"
                          style={{
                            width: '100%',
                            height: '180px',
                            objectFit: 'cover',
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                    )}

                    {/* Polaroid-style Quote Card background */}
                    <div
                      className={note.cardStyle || 'gradient-violet'}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        color: 'white',
                        marginBottom: '1rem',
                        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.15)',
                        position: 'relative',
                      }}
                    >
                      <span style={{ position: 'absolute', top: '0.25rem', left: '0.5rem', fontSize: '2.5rem', opacity: 0.25, fontFamily: 'serif', lineHeight: 1 }}>“</span>
                      <p
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '1rem',
                          lineHeight: 1.5,
                          fontStyle: 'italic',
                          fontWeight: 500,
                          margin: 0,
                          padding: '0.25rem 0 0.25rem 0.5rem',
                          whiteSpace: 'pre-wrap',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        {note.quote}
                      </p>
                    </div>

                    {/* User thoughts */}
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                      {note.thought}
                    </p>

                    {/* Associated Book Link */}
                    {note.userBook && (
                      <div
                        style={{
                          marginTop: 'auto',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>書籍情報</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          {note.userBook.book.title}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          著者: {note.userBook.book.author}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT 2: BOOKSHELF & PROGRESS TRACKING --- */}
      {activeTab === 'books' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', margin: 0 }}>グループ本棚</h2>
            <button
              onClick={() => setShowAddBookModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>課題本を追加</span>
            </button>
          </div>

          {details.books.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <Book size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>本棚は空です</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                この読書会で一緒に読む本を本棚から追加しましょう！
              </p>
              <button onClick={() => setShowAddBookModal(true)} className="btn btn-primary">
                最初の課題本を追加する
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {details.books.map((gb) => (
                <div key={gb.id} className="glass-panel" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Book Cover */}
                  <div
                    style={{
                      width: '90px',
                      height: '130px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    {gb.coverUrl ? (
                      <img src={gb.coverUrl} alt={gb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                        <Book size={32} />
                      </div>
                    )}
                  </div>

                  {/* Book Info & Member Progress */}
                  <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.25rem' }}>{gb.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>著者: {gb.author}</p>

                    {/* Member Progress Section */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>メンバーの進捗状況</div>
                      
                      {gb.progress.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>この本を読書中に設定しているメンバーはいません。</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {gb.progress.map((prog) => {
                            const badge = getStatusBadgeColor(prog.status);
                            const percent = prog.pageCount && prog.pageCount > 0
                              ? Math.min(100, Math.round((prog.currentPage / prog.pageCount) * 100))
                              : 0;
                            
                            return (
                              <div key={prog.userId} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 500 }}>{prog.name}</span>
                                    {prog.userId === currentUserId && (
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>自分</span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {prog.status === 'wishlist' ? (
                                        '未読'
                                      ) : prog.pageCount ? (
                                        `${percent}% (${prog.currentPage} / ${prog.pageCount}p)`
                                      ) : (
                                        `${prog.currentPage}p`
                                      )}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '0.65rem',
                                        padding: '0.1rem 0.4rem',
                                        borderRadius: '4px',
                                        background: badge.bg,
                                        color: badge.text,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {badge.label}
                                    </span>
                                  </div>
                                </div>
                                {prog.status !== 'wishlist' && prog.pageCount && (
                                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${percent}%`,
                                        height: '100%',
                                        background: prog.status === 'completed' ? 'var(--color-success)' : 'var(--color-secondary)',
                                        borderRadius: '2px',
                                        transition: 'width 0.3s ease',
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT 3: MEMBERS LIST --- */}
      {activeTab === 'members' && (
        <div className="animate-fade-in">
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '1rem' }}>メンバー</th>
                  <th style={{ padding: '1rem' }}>役割</th>
                  <th style={{ padding: '1rem' }}>参加日</th>
                </tr>
              </thead>
              <tbody>
                {details.members.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'var(--grad-cosmic)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          color: 'white',
                        }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontWeight: 500 }}>{member.name}</span>
                        {member.userId === currentUserId && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>(あなた)</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: member.role === 'admin' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: member.role === 'admin' ? '#a5b4fc' : 'var(--text-secondary)',
                          border: '1px solid ' + (member.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)'),
                        }}
                      >
                        {member.role === 'admin' ? '管理者' : 'メンバー'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(member.joinedAt).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD BOOK TO GROUP DIALOG --- */}
      {showAddBookModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', position: 'relative', animation: 'scale-up 0.2s ease-out' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              📚 グループ本棚に本を追加
            </h2>

            {addBookError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fda4af', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {addBookError}
              </div>
            )}

            {userBooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  あなたのマイ本棚に登録されている本はありません。まずは本棚に本を追加してください。
                </p>
                <button onClick={() => router.push('/add')} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                  本棚に本を追加しに行く
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>あなたの本棚から本を選択*</label>
                  <select
                    className="input-field"
                    style={{ width: '100%', background: 'var(--bg-tertiary)', color: 'white' }}
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    disabled={addingBook}
                  >
                    <option value="">-- 本を選択してください --</option>
                    {userBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.author})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setShowAddBookModal(false);
                      setAddBookError('');
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    disabled={addingBook}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddBookToGroup}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    disabled={addingBook || !selectedBookId}
                  >
                    {addingBook ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>本棚に追加</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
