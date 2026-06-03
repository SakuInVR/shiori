import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import CanvasClient from './CanvasClient';

export default async function CanvasPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/canvas');
  }

  const userId = (session.user as any).id;

  const notes = await db.inspiration.findMany({
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
    <CanvasClient
      notes={notes}
      username={session.user.name || '読書家'}
    />
  );
}
