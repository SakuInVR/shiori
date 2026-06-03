'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Book, Key, ArrowRight, Loader2, X } from 'lucide-react';
import { createGroup, joinGroup } from '@/app/actions';

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdById: string;
  createdAt: Date;
  memberCount: number;
  bookCount: number;
  role: string;
}

export default function GroupsClient({ initialGroups }: { initialGroups: GroupItem[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupItem[]>(initialGroups);
  
  // Dialog visibility states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await createGroup(groupName, groupDesc);
      if (res.error) {
        setError(res.error);
      } else {
        setShowCreateModal(false);
        setGroupName('');
        setGroupDesc('');
        router.refresh();
        // The router.refresh() will update page props, but we can redirect or let the user click
        if (res.groupId) {
          router.push(`/groups/${res.groupId}`);
        }
      }
    } catch (err) {
      setError('グループの作成中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await joinGroup(inviteCode);
      if (res.error) {
        setError(res.error);
      } else {
        setShowJoinModal(false);
        setInviteCode('');
        router.refresh();
        if (res.groupId) {
          router.push(`/groups/${res.groupId}`);
        }
      }
    } catch (err) {
      setError('グループの参加中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>読書グループ</h1>
          <p style={{ color: 'var(--text-secondary)' }}>クローズドな読書会を作成し、メンバー同士で進捗やメモを限定共有できます。</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowJoinModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={16} />
            <span>グループに参加</span>
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            <span>グループを作成</span>
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>参加しているグループはありません</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            新しく読書グループを作成するか、招待コードを受け取ってグループに参加しましょう！
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => setShowJoinModal(true)} className="btn btn-secondary">
              招待コードで参加
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              グループを作成
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {groups.map((group) => (
            <div key={group.id} className="glass-panel glass-panel-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', margin: 0, fontWeight: 600 }}>
                  {group.name}
                </h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '12px',
                    background: group.role === 'admin' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: group.role === 'admin' ? '#a5b4fc' : 'var(--text-secondary)',
                    border: '1px solid ' + (group.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)'),
                  }}
                >
                  {group.role === 'admin' ? '管理者' : 'メンバー'}
                </span>
              </div>
              
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  marginBottom: '1.5rem',
                  flexGrow: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '3.6rem',
                }}
              >
                {group.description || '説明はありません。'}
              </p>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Users size={14} />
                  <span>{group.memberCount} 人のメンバー</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Book size={14} />
                  <span>{group.bookCount} 冊の課題本</span>
                </span>
              </div>

              <button
                onClick={() => router.push(`/groups/${group.id}`)}
                className="btn btn-secondary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
              >
                <span>グループを開く</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- CREATE GROUP MODAL --- */}
      {showCreateModal && (
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
            <button
              onClick={() => {
                setShowCreateModal(false);
                setError('');
              }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} style={{ color: 'var(--color-primary)' }} />
              <span>グループを作成</span>
            </h2>

            {error && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fda4af', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>グループ名*</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="例: 人生を変える読書サークル"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>グループの説明 (任意)</label>
                <textarea
                  className="input-field"
                  style={{ height: '80px', resize: 'vertical' }}
                  placeholder="サークルの目的や課題本の選定ルールなどを記載します。"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : '作成する'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- JOIN GROUP MODAL --- */}
      {showJoinModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', position: 'relative', animation: 'scale-up 0.2s ease-out' }}>
            <button
              onClick={() => {
                setShowJoinModal(false);
                setError('');
              }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} style={{ color: 'var(--color-secondary)' }} />
              <span>グループに参加</span>
            </h2>

            {error && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fda4af', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleJoinGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>8桁の招待コード*</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="例: AB12CD34"
                  maxLength={8}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : '参加する'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
