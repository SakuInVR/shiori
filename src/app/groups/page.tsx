import { getGroups } from '@/app/actions';
import GroupsClient from './GroupsClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'グループ - しおり (Shiori)',
  description: '読書サークルやグループを作成・管理し、クローズドな環境で読書の気づきを共有します。',
};

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login?callbackUrl=/groups');
  }

  const groups = await getGroups();

  return <GroupsClient initialGroups={groups} />;
}
