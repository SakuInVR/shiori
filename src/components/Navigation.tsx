'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { BookOpen, Compass, Plus, LogOut, LogIn, UserPlus, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';

export default function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="header">
      <div className="nav-container">
        <Link href={session ? '/dashboard' : '/explore'} className="logo">
          <BookOpen size={24} className="logo-icon" style={{ stroke: 'url(#logo-grad)' }} />
          <span>しおり <span style={{ fontSize: '0.85rem', fontWeight: 400, opacity: 0.8, letterSpacing: '0.05em' }}>SHIORI</span></span>
        </Link>

        {/* SVG Gradient Definition for Logo Icon */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </svg>

        <nav>
          <ul className="nav-links">
            <li>
              <Link
                href="/explore"
                className={`nav-link ${isActive('/explore') ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Compass size={16} />
                <span>探す</span>
              </Link>
            </li>

            {status === 'authenticated' && session ? (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Sparkles size={16} />
                    <span>マイ本棚</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/groups"
                    className={`nav-link ${isActive('/groups') ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Users size={16} />
                    <span>グループ</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/add"
                    className={`nav-link ${isActive('/add') ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={16} />
                    <span>本を追加</span>
                  </Link>
                </li>
                <li className="user-nav-badge">
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--grad-cosmic)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      color: 'white',
                    }}
                  >
                    {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.user?.name}
                  </span>
                </li>
                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: '/explore' })}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <LogOut size={14} />
                    <span>ログアウト</span>
                  </button>
                </li>
              </>
            ) : (
              status !== 'loading' && (
                <>
                  <li>
                    <Link
                      href="/login"
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <LogIn size={14} />
                      <span>ログイン</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/register"
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <UserPlus size={14} />
                      <span>会員登録</span>
                    </Link>
                  </li>
                </>
              )
            )}
      </ul>
        </nav>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav">
        <Link href="/explore" className={`mobile-nav-item ${isActive('/explore') ? 'active' : ''}`}>
          <Compass size={20} />
          <span>探す</span>
        </Link>
        
        {status === 'authenticated' && session ? (
          <>
            <Link href="/groups" className={`mobile-nav-item ${isActive('/groups') ? 'active' : ''}`}>
              <Users size={20} />
              <span>グループ</span>
            </Link>
            
            <div className="mobile-fab-item">
              <Link href="/add" className="mobile-fab-btn" title="本を追加" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={24} />
              </Link>
            </div>
            
            <Link href="/canvas" className={`mobile-nav-item ${isActive('/canvas') ? 'active' : ''}`}>
              <Sparkles size={20} />
              <span>キャンバス</span>
            </Link>
            
            <Link href="/dashboard" className={`mobile-nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
              <BookOpen size={20} />
              <span>マイ本棚</span>
            </Link>
          </>
        ) : (
          status !== 'loading' && (
            <>
              <Link href="/login" className={`mobile-nav-item ${isActive('/login') ? 'active' : ''}`}>
                <LogIn size={20} />
                <span>ログイン</span>
              </Link>
              <Link href="/register" className={`mobile-nav-item ${isActive('/register') ? 'active' : ''}`}>
                <UserPlus size={20} />
                <span>登録</span>
              </Link>
            </>
          )
        )}
      </div>
    </header>
  );
}
