'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, User, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { ensureGuestUser } from '@/app/actions';

interface LoginFormProps {
  errorParam?: string;
  callbackUrl?: string;
  googleEnabled: boolean;
}

export default function LoginForm({ errorParam, callbackUrl, googleEnabled }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(errorParam ? 'ログインに失敗しました。認証情報を確認してください。' : '');
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください。');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: callbackUrl || '/dashboard',
      });

      if (res?.error) {
        setError('ユーザー名またはパスワードが正しくありません。');
        setIsLoading(false);
      } else {
        router.push(callbackUrl || '/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('接続中にエラーが発生しました。');
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    setError('');

    try {
      // 1. Ensure the guest user database record exists first
      const res = await ensureGuestUser();
      
      if (res?.error) {
        setError(res.error);
        setIsGuestLoading(false);
        return;
      }

      // 2. Perform sign in using credentials provider
      const signinRes = await signIn('credentials', {
        username: 'guest',
        password: 'guestpassword',
        redirect: false,
        callbackUrl: callbackUrl || '/dashboard',
      });

      if (signinRes?.error) {
        setError('ゲストログインに失敗しました。');
        setIsGuestLoading(false);
      } else {
        router.push(callbackUrl || '/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('ゲストユーザー作成中にエラーが発生しました。');
      setIsGuestLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: callbackUrl || '/dashboard' });
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
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '0.5rem' }}>しおりにログイン</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>あなたの読書インスピレーションを管理します</p>
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
            <label htmlFor="username">ユーザー名</label>
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
                placeholder="ユーザー名を入力"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading || isGuestLoading}
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
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isGuestLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={isLoading || isGuestLoading}
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div style={{ position: 'relative', margin: '1.5rem 0', textAlign: 'center' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-primary)',
              padding: '0 0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            または
          </span>
        </div>

        {/* Guest login action button */}
        <button
          onClick={handleGuestLogin}
          className="btn btn-secondary glass-panel-hover"
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'rgba(99, 102, 241, 0.05)',
          }}
          disabled={isLoading || isGuestLoading}
        >
          <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
          <span>{isGuestLoading ? '準備中...' : 'ワンクリックでゲストログイン'}</span>
        </button>

        {googleEnabled && (
          <button
            onClick={handleGoogleLogin}
            className="btn btn-secondary"
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            disabled={isLoading || isGuestLoading}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: 'currentColor' }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Googleでログイン</span>
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>アカウントをお持ちでないですか？ </span>
          <Link href="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            会員登録
          </Link>
        </div>
      </div>
    </div>
  );
}
