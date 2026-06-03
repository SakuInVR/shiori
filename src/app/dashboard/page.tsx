import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  const userId = (session.user as any).id;

  // 1. Fetch user's books
  const userBooks = await db.userBook.findMany({
    where: { userId },
    include: {
      book: true,
      inspirations: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  // 2. Fetch all user's notes
  const userNotes = await db.inspiration.findMany({
    where: { userId },
    include: {
      userBook: {
        include: {
          book: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <DashboardClient
      initialBooks={userBooks}
      initialNotes={userNotes}
      username={session.user.name || '読書家'}
      userId={userId}
    />
  );
}
