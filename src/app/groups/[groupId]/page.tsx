import { getGroupDetails } from '@/app/actions';
import GroupDetailsClient from './GroupDetailsClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';

export async function generateMetadata({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { title: 'グループ - しおり' };

  const details = await getGroupDetails(groupId);
  if ('error' in details || !details.group) {
    return { title: 'グループ詳細 - しおり' };
  }

  return {
    title: `${details.group.name} - しおり (Shiori)`,
    description: details.group.description || '読書会グループ詳細ページです。',
  };
}

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect(`/login?callbackUrl=/groups/${groupId}`);
  }

  const userId = (session.user as any).id;
  const details = await getGroupDetails(groupId);

  if ('error' in details) {
    redirect('/groups');
  }

  // Fetch the user's books to let them add books to the group bookshelf
  const userBooks = await db.userBook.findMany({
    where: { userId },
    include: {
      book: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <GroupDetailsClient
      groupId={groupId}
      initialDetails={details}
      userBooks={userBooks.map((ub) => ub.book)}
      currentUserId={userId}
    />
  );
}
