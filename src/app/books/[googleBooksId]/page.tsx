import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import BookHubClient from './BookHubClient';

export default async function BookHubPage({
  params,
}: {
  params: Promise<{ googleBooksId: string }>;
}) {
  const { googleBooksId } = await params;
  const user = await getCurrentUser();
  const currentUserId = user?.id || null;

  // 1. Fetch book details
  const book = await db.book.findUnique({
    where: { googleBooksId },
  });

  if (!book) {
    return notFound();
  }

  // 2. Fetch current user's UserBook relation if they have registered it
  const currentUserBook = currentUserId
    ? await db.userBook.findFirst({
        where: {
          userId: currentUserId,
          bookId: book.id,
        },
      })
    : null;

  // 3. Fetch all readers who have made this book public (exclude current user to show others)
  const readers = await db.userBook.findMany({
    where: {
      bookId: book.id,
      isPublic: true,
      NOT: currentUserId ? { userId: currentUserId } : undefined,
    },
    include: {
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });

  // 4. Fetch all public notes for this book, plus the current user's private notes for it
  const allNotes = await db.inspiration.findMany({
    where: {
      userBook: {
        bookId: book.id,
      },
      OR: [
        { isPublic: true },
        ...(currentUserId ? [{ userId: currentUserId }] : []),
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <BookHubClient
      book={book}
      currentUserBook={currentUserBook}
      readers={readers}
      allNotes={allNotes as any}
      currentUserId={currentUserId}
    />
  );
}
