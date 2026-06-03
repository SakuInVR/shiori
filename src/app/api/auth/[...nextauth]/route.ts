import NextAuth, { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

const providers: any[] = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.username || !credentials?.password) {
        throw new Error('ユーザー名とパスワードを入力してください。');
      }

      const user = await db.user.findUnique({
        where: { username: credentials.username },
      });

      if (!user || !user.passwordHash) {
        throw new Error('ユーザー名またはパスワードが正しくありません。');
      }

      const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

      if (!isValid) {
        throw new Error('ユーザー名またはパスワードが正しくありません。');
      }

      return {
        id: user.id,
        name: user.name || user.username,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
  },
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        
        // Fetch the user from DB to verify if username is set (for credentials users)
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { username: true, name: true },
        });
        token.username = dbUser?.username || null;
        token.name = dbUser?.name || user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        session.user.name = token.name;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
