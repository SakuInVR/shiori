import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as { id: string; name: string; email?: string; image?: string; username?: string | null }) : null;
}
