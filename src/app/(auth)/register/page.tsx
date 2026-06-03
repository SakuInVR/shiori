import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import RegisterForm from './RegisterForm';

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  // If already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  return <RegisterForm />;
}
