import Link from 'next/link';
import { BookOpen, Sparkles, Compass, Users, ArrowRight, MessageSquare, Award } from 'lucide-react';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  // If already logged in, send them straight to their bookshelf dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '5rem', padding: '2rem 0' }}>
      
      {/* 1. Hero Section */}
      <section style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#a5b4fc',
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
          <span>本から得たインスピレーションを美しく記録</span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '3.5rem',
            lineHeight: 1.15,
            fontWeight: 800,
            background: 'linear-gradient(to right, #ffffff 30%, #c7d2fe 70%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          読書から生まれる、<br />
          あなただけのひらめきを「しおり」に。
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: 1.6, maxWidth: '600px' }}>
          「しおり (Shiori)」は、読んだ本とその中から得たひらめきや心に残った言葉を、美しいビジュアルカード形式で残すデジタルガーデンです。個人の読書記録としてはもちろん、読書会（イベント）でのリアルタイム共有にも最適です。
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/register" className="btn btn-primary" style={{ padding: '0.8rem 1.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>今すぐ始める (無料)</span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/explore" className="btn btn-secondary" style={{ padding: '0.8rem 1.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Compass size={18} />
            <span>みんなのメモを覗く</span>
          </Link>
        </div>
      </section>

      {/* 2. Visual Features Grid */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>しおりの3つの特徴</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>あなたの知的な旅路をサポートする機能たち</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
          }}
        >
          {[
            {
              title: '本のインスピレーションを美しく保存',
              desc: '本から得た印象的なフレーズと、あなたのインスピレーションをセットで保存。好みに合わせた美しいグラデーション背景を選択してカード化できます。',
              icon: <Sparkles size={24} style={{ color: 'var(--color-primary)' }} />,
              grad: 'rgba(99, 102, 241, 0.03)',
            },
            {
              title: 'マインド・キャンバス',
              desc: '保存したメモが、コルクボードのように美しく並ぶ「マインド・キャンバス」をご用意。タグやキーワードで瞬時に絞り込み、思考の断片を結びつけられます。',
              icon: <MessageSquare size={24} style={{ color: 'var(--color-secondary)' }} />,
              grad: 'rgba(6, 182, 212, 0.03)',
            },
            {
              title: '読書会やイベントでの共有',
              desc: 'メモや本棚の公開・非公開はワンクリックで設定可能。公開したメモは本の個別ハブや広場に集まり、読書会などのイベントで参加者全員の感想を簡単に共有できます。',
              icon: <Users size={24} style={{ color: 'var(--color-success)' }} />,
              grad: 'rgba(16, 185, 129, 0.03)',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-panel glass-panel-hover"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                padding: '2rem',
                background: `linear-gradient(135deg, ${item.grad}, rgba(255,255,255,0.01))`,
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {item.icon}
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {item.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Reading Group / Book Club Call To Action */}
      <section
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '2rem',
          padding: '3rem',
          background: 'radial-gradient(circle at 100% 0%, rgba(6, 182, 212, 0.1) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(99, 102, 241, 0.1) 0%, transparent 60%)',
          borderColor: 'rgba(99, 102, 241, 0.15)',
        }}
      >
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>
            読書会や催しの現場を、もっとクリエイティブに。
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
            「しおり」を使えば、特定の書籍や著者ごとに全員の公開メモを自動で一本化できます。読書会で集まった際に「このページについてみんなはどう考えたか？」をリアルタイムで画面に映し出し、対話を深めることができます。
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '0.8rem 1.5rem' }}>
            ログインして始める
          </Link>
        </div>
      </section>

    </div>
  );
}
