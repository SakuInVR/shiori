import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);

  // If already logged in, redirect to dashboard or callbackUrl
  if (session) {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const isGoogleEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <LoginForm
      errorParam={resolvedParams.error}
      callbackUrl={resolvedParams.callbackUrl}
      googleEnabled={isGoogleEnabled}
    />
  );
}
