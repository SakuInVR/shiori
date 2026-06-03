import { db } from '@/lib/db';
import ExploreClient from './ExploreClient';

export default async function ExplorePage() {
  // 1. Fetch public notes from all users
  const publicNotes = await db.inspiration.findMany({
    where: { isPublic: true },
    include: {
      user: {
        select: {
          name: true,
          username: true,
        },
      },
      userBook: {
        include: {
          book: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Fetch books that have at least one public reader
  const publicBooks = await db.book.findMany({
    where: {
      userBooks: {
        some: { isPublic: true },
      },
    },
    include: {
      userBooks: {
        where: { isPublic: true },
        include: {
          user: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  return (
    <ExploreClient
      initialNotes={publicNotes}
      initialBooks={publicBooks}
    />
  );
}
