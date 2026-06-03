'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

// 1. User Registration Action
export async function registerUser(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;

  if (!username || !password || !displayName) {
    return { error: 'すべての項目を入力してください。' };
  }

  if (username.length < 3) {
    return { error: 'ユーザー名は3文字以上で入力してください。' };
  }

  if (password.length < 6) {
    return { error: 'パスワードは6文字以上で入力してください。' };
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return { error: 'このユーザー名はすでに使用されています。' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        username,
        passwordHash,
        name: displayName,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { error: '登録中にエラーが発生しました。時間をおいてやり直してください。' };
  }
}

// 2. Add Book to Shelf Action
export async function addBookToShelf(bookData: {
  googleBooksId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  status: string;
  isPublic: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    // 1. Ensure global Book exists
    let book = await db.book.findUnique({
      where: { googleBooksId: bookData.googleBooksId },
    });

    if (!book) {
      book = await db.book.create({
        data: {
          googleBooksId: bookData.googleBooksId,
          title: bookData.title,
          author: bookData.author || '不明な著者',
          coverUrl: bookData.coverUrl,
          description: bookData.description,
          pageCount: bookData.pageCount ? Number(bookData.pageCount) : null,
        },
      });
    }

    // 2. Check if user already has this book on their shelf
    const existingUserBook = await db.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: book.id,
        },
      },
    });

    if (existingUserBook) {
      return { error: 'この本はすでに本棚に登録されています。' };
    }

    // 3. Create UserBook entry
    await db.userBook.create({
      data: {
        userId: user.id,
        bookId: book.id,
        status: bookData.status,
        isPublic: bookData.isPublic,
        currentPage: 0,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/explore');
    revalidatePath(`/users/${user.username || user.id}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Add book error:', error);
    return { error: '本の追加中にエラーが発生しました。' };
  }
}

// 3. Update Reading Progress Action
export async function updateReadingProgress(
  userBookId: string,
  currentPage: number,
  status: string
) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const userBook = await db.userBook.findUnique({
      where: { id: userBookId },
      include: { book: true },
    });

    if (!userBook || userBook.userId !== user.id) {
      return { error: '権限がありません。' };
    }

    const maxPages = userBook.book.pageCount || 9999;
    const validatedPage = Math.min(Math.max(0, currentPage), maxPages);
    
    // Automatically set status to completed if page count reaches max
    let newStatus = status;
    if (userBook.book.pageCount && validatedPage >= userBook.book.pageCount) {
      newStatus = 'completed';
    }

    await db.userBook.update({
      where: { id: userBookId },
      data: {
        currentPage: validatedPage,
        status: newStatus,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath(`/books/${userBook.book.googleBooksId}`);
    revalidatePath(`/users/${user.username || user.id}`);

    return { success: true };
  } catch (error: any) {
    console.error('Update progress error:', error);
    return { error: '進捗の更新中にエラーが発生しました。' };
  }
}

// 4. Delete Book from Shelf Action
export async function deleteBookFromShelf(userBookId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const userBook = await db.userBook.findUnique({
      where: { id: userBookId },
      include: { book: true },
    });

    if (!userBook || userBook.userId !== user.id) {
      return { error: '権限がありません。' };
    }

    // Delete notes first (onDelete: Cascade is set, but Prisma handles it)
    await db.userBook.delete({
      where: { id: userBookId },
    });

    revalidatePath('/dashboard');
    revalidatePath(`/books/${userBook.book.googleBooksId}`);
    revalidatePath(`/users/${user.username || user.id}`);
    revalidatePath('/explore');

    return { success: true };
  } catch (error: any) {
    console.error('Delete book error:', error);
    return { error: '本の削除中にエラーが発生しました。' };
  }
}

// 5. Create Inspiration Note Action
export async function createInspirationNote(noteData: {
  userBookId: string | null;
  quote: string;
  thought: string;
  page: number | null;
  chapter: string | null;
  prompt: string | null;
  imageUrl: string | null;
  tag: string;
  cardStyle: string;
  isPublic: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  if (!noteData.quote || !noteData.thought) {
    return { error: '引用文と考察は必須です。' };
  }

  try {
    if (noteData.userBookId) {
      const userBook = await db.userBook.findUnique({
        where: { id: noteData.userBookId },
        include: { book: true },
      });

      if (!userBook || userBook.userId !== user.id) {
        return { error: '権限がありません。' };
      }
    }

    const note = await db.inspiration.create({
      data: {
        userId: user.id,
        userBookId: noteData.userBookId,
        quote: noteData.quote,
        thought: noteData.thought,
        page: noteData.page ? Number(noteData.page) : null,
        chapter: noteData.chapter || null,
        prompt: noteData.prompt || null,
        imageUrl: noteData.imageUrl || null,
        tag: noteData.tag,
        cardStyle: noteData.cardStyle,
        isPublic: noteData.isPublic,
      },
      include: {
        userBook: {
          include: { book: true }
        }
      }
    });

    revalidatePath('/dashboard');
    revalidatePath('/explore');
    revalidatePath('/canvas');
    if (note.userBook) {
      revalidatePath(`/books/${note.userBook.book.googleBooksId}`);
    }
    revalidatePath(`/users/${user.username || user.id}`);

    return { success: true };
  } catch (error: any) {
    console.error('Create note error:', error);
    return { error: 'メモの作成中にエラーが発生しました。' };
  }
}

// 6. Delete Inspiration Note Action
export async function deleteInspirationNote(noteId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const note = await db.inspiration.findUnique({
      where: { id: noteId },
      include: { userBook: { include: { book: true } } },
    });

    if (!note || note.userId !== user.id) {
      return { error: '権限がありません。' };
    }

    await db.inspiration.delete({
      where: { id: noteId },
    });

    revalidatePath('/dashboard');
    revalidatePath('/explore');
    revalidatePath('/canvas');
    if (note.userBook) {
      revalidatePath(`/books/${note.userBook.book.googleBooksId}`);
    }
    revalidatePath(`/users/${user.username || user.id}`);

    return { success: true };
  } catch (error: any) {
    console.error('Delete note error:', error);
    return { error: 'メモの削除中にエラーが発生しました。' };
  }
}

// 7. Toggle Book Privacy Action
export async function toggleBookPrivacy(userBookId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const userBook = await db.userBook.findUnique({
      where: { id: userBookId },
      include: { book: true },
    });

    if (!userBook || userBook.userId !== user.id) {
      return { error: '権限がありません。' };
    }

    const updated = await db.userBook.update({
      where: { id: userBookId },
      data: { isPublic: !userBook.isPublic },
    });

    revalidatePath('/dashboard');
    revalidatePath('/explore');
    revalidatePath(`/books/${userBook.book.googleBooksId}`);
    revalidatePath(`/users/${user.username || user.id}`);

    return { success: true, isPublic: updated.isPublic };
  } catch (error: any) {
    console.error('Toggle book privacy error:', error);
    return { error: '本の公開設定の切り替え中にエラーが発生しました。' };
  }
}

// 8. Toggle Note Privacy Action
export async function toggleNotePrivacy(noteId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const note = await db.inspiration.findUnique({
      where: { id: noteId },
      include: { userBook: { include: { book: true } } },
    });

    if (!note || note.userId !== user.id) {
      return { error: '権限がありません。' };
    }

    const updated = await db.inspiration.update({
      where: { id: noteId },
      data: { isPublic: !note.isPublic },
    });

    revalidatePath('/dashboard');
    revalidatePath('/explore');
    revalidatePath('/canvas');
    if (note.userBook) {
      revalidatePath(`/books/${note.userBook.book.googleBooksId}`);
    }
    revalidatePath(`/users/${user.username || user.id}`);

    return { success: true, isPublic: updated.isPublic };
  } catch (error: any) {
    console.error('Toggle note privacy error:', error);
    return { error: 'メモの公開設定の切り替え中にエラーが発生しました。' };
  }
}

// 9. Ensure Guest User Action
export async function ensureGuestUser() {
  try {
    const guestUsername = 'guest';
    const existing = await db.user.findUnique({
      where: { username: guestUsername },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash('guestpassword', 10);
      await db.user.create({
        data: {
          username: guestUsername,
          passwordHash,
          name: 'ゲスト読書家',
        },
      });
      console.log('[Guest Setup] Created default guest account successfully.');
    }
    return { success: true };
  } catch (error: any) {
    console.error('Ensure guest user error:', error);
    return { error: 'ゲストユーザーの作成中にエラーが発生しました。' };
  }
}

// 10. Update Inspiration Note (Link to Book / Edit Details)
export async function updateInspirationNote(
  noteId: string,
  noteData: {
    userBookId: string | null;
    quote: string;
    thought: string;
    page: number | null;
    chapter: string | null;
    prompt: string | null;
    imageUrl: string | null;
    tag: string;
    cardStyle: string;
    isPublic: boolean;
  }
) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const existingNote = await db.inspiration.findUnique({
      where: { id: noteId },
    });

    if (!existingNote || existingNote.userId !== user.id) {
      return { error: '権限がありません。' };
    }

    if (noteData.userBookId) {
      const userBook = await db.userBook.findUnique({
        where: { id: noteData.userBookId },
      });

      if (!userBook || userBook.userId !== user.id) {
        return { error: '選択された本が正しくありません。' };
      }
    }

    const updated = await db.inspiration.update({
      where: { id: noteId },
      data: {
        userBookId: noteData.userBookId,
        quote: noteData.quote,
        thought: noteData.thought,
        page: noteData.page ? Number(noteData.page) : null,
        chapter: noteData.chapter || null,
        prompt: noteData.prompt || null,
        imageUrl: noteData.imageUrl || null,
        tag: noteData.tag,
        cardStyle: noteData.cardStyle,
        isPublic: noteData.isPublic,
      },
      include: {
        userBook: {
          include: { book: true }
        }
      }
    });

    revalidatePath('/dashboard');
    revalidatePath('/explore');
    revalidatePath('/canvas');
    if (updated.userBook) {
      revalidatePath(`/books/${updated.userBook.book.googleBooksId}`);
    }
    revalidatePath(`/users/${user.username || user.id}`);

    return { success: true };
  } catch (error: any) {
    console.error('Update note error:', error);
    return { error: 'メモの更新中にエラーが発生しました。' };
  }
}

// 11. Search Books from Google Books API Server-side Action
export async function searchBooks(query: string) {
  if (!query.trim()) return { error: '検索クエリが空です。' };

  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10${keyParam}`
    );

    if (!res.ok) {
      if (res.status === 429) {
        return { 
          error: 'Google APIの無料制限に達しました。.envに「GOOGLE_BOOKS_API_KEY」を設定するか、以下の「手動で本を追加」ボタンから手動登録してください。' 
        };
      }
      return { error: `書籍の取得に失敗しました (ステータス: ${res.status})。` };
    }

    const data = await res.json();
    return { items: data.items || [] };
  } catch (error: any) {
    console.error('Google Books Search API error:', error);
    return { error: '書籍検索中にエラーが発生しました。インターネット接続をご確認ください。' };
  }
}
