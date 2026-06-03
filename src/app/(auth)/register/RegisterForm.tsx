'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, User, Lock, Smile, AlertCircle } from 'lucide-react';
import { registerUser } from '@/app/actions';

export default function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !displayName) {
      setError('すべての項目を入力してください。');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('displayName', displayName);

    try {
      const res = await registerUser(formData);

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push('/login?registered=true');
      }
    } catch (err) {
      setError('サーバー接続時にエラーが発生しました。');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '1rem',
      }}
    >
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '0.5rem' }}>アカウント登録</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>しおりを始めてインスピレーションを記録しましょう</p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              color: '#fda4af',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="displayName">表示名 (ニックネーム)</label>
            <div style={{ position: 'relative' }}>
              <Smile
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="displayName"
                type="text"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="読書会でのニックネームなど"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">ユーザー名 (ログインID)</label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="username"
                type="text"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="英数字で入力 (3文字以上)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="password"
                type="password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="6文字以上で入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading ? '登録中...' : '登録する'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>すでにアカウントをお持ちですか？ </span>
          <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
