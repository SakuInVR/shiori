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
  groupIds?: string[];
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
    const userBook = await db.userBook.create({
      data: {
        userId: user.id,
        bookId: book.id,
        status: bookData.status,
        isPublic: bookData.isPublic,
        currentPage: 0,
      },
    });

    // 4. Share with groups if group IDs are provided
    if (bookData.groupIds && bookData.groupIds.length > 0) {
      for (const gid of bookData.groupIds) {
        await db.groupShare.create({
          data: {
            groupId: gid,
            userBookId: userBook.id,
          },
        });
      }
    }

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
  groupIds?: string[];
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

    // Share with groups if group IDs are provided
    if (noteData.groupIds && noteData.groupIds.length > 0) {
      for (const gid of noteData.groupIds) {
        await db.groupNoteShare.create({
          data: {
            groupId: gid,
            inspirationId: note.id,
          },
        });
      }
    }

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
    groupIds?: string[];
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

    // Sync group shares if groupIds are provided
    if (noteData.groupIds) {
      await db.groupNoteShare.deleteMany({
        where: {
          inspirationId: noteId,
          groupId: { notIn: noteData.groupIds },
        },
      });

      for (const gid of noteData.groupIds) {
        await db.groupNoteShare.upsert({
          where: {
            groupId_inspirationId: {
              groupId: gid,
              inspirationId: noteId,
            },
          },
          create: {
            groupId: gid,
            inspirationId: noteId,
          },
          update: {},
        });
      }
    }

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

// 12. Fetch all unique authors in the database for autocompletion
export async function getExistingAuthors() {
  try {
    const books = await db.book.findMany({
      select: { author: true },
    });
    
    const authorSet = new Set<string>();
    books.forEach((b) => {
      if (b.author) {
        b.author.split(', ').forEach((auth) => {
          const trimmed = auth.trim();
          if (trimmed) authorSet.add(trimmed);
        });
      }
    });

    return Array.from(authorSet).sort();
  } catch (error: any) {
    console.error('Failed to get existing authors:', error);
    return [];
  }
}

// 13. Create a reading group
export async function createGroup(name: string, description?: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  if (!name.trim()) return { error: 'グループ名を入力してください。' };

  try {
    let inviteCode = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codeExists = true;
    while (codeExists) {
      inviteCode = '';
      for (let i = 0; i < 8; i++) {
        inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await db.group.findUnique({ where: { inviteCode } });
      if (!existing) codeExists = false;
    }

    const group = await db.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        inviteCode,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'admin',
          },
        },
      },
    });

    revalidatePath('/groups');
    return { success: true, groupId: group.id };
  } catch (error: any) {
    console.error('Failed to create group:', error);
    return { error: 'グループの作成に失敗しました。' };
  }
}

// 14. Join a group with an invite code
export async function joinGroup(inviteCode: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  const code = inviteCode.trim().toUpperCase();
  if (!code) return { error: '招待コードを入力してください。' };

  try {
    const group = await db.group.findUnique({
      where: { inviteCode: code },
    });

    if (!group) {
      return { error: '招待コードが無効です。グループが見つかりません。' };
    }

    // Check if already a member
    const existingMember = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return { error: 'すでにこのグループに参加しています。', groupId: group.id };
    }

    await db.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
        role: 'member',
      },
    });

    revalidatePath('/groups');
    return { success: true, groupId: group.id };
  } catch (error: any) {
    console.error('Failed to join group:', error);
    return { error: 'グループの参加に失敗しました。' };
  }
}

// 15. Get all groups user belongs to
export async function getGroups() {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const memberships = await db.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                books: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      inviteCode: m.group.inviteCode,
      createdById: m.group.createdById,
      createdAt: m.group.createdAt,
      memberCount: m.group._count.members,
      bookCount: m.group._count.books,
      role: m.role,
    }));
  } catch (error) {
    console.error('Failed to get groups:', error);
    return [];
  }
}

// 16. Get group details (info, books with members progress, activity feed)
export async function getGroupDetails(groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return { error: 'このグループにアクセスする権限がありません。' };
    }

    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        books: {
          include: {
            book: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!group) return { error: 'グループが見つかりません。' };

    const bookIds = group.books.map((gb) => gb.bookId);
    const memberUserIds = group.members.map((m) => m.userId);

    const groupShares = await db.groupShare.findMany({
      where: {
        groupId,
        userBook: {
          userId: { in: memberUserIds },
          bookId: { in: bookIds },
        },
      },
      include: {
        userBook: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            book: true,
          },
        },
      },
    });

    const progressMap: Record<string, Array<{
      userId: string;
      name: string;
      currentPage: number;
      pageCount: number | null;
      status: string;
      updatedAt: Date;
    }>> = {};

    groupShares.forEach((gs) => {
      const ub = gs.userBook;
      if (!progressMap[ub.bookId]) {
        progressMap[ub.bookId] = [];
      }
      progressMap[ub.bookId].push({
        userId: ub.userId,
        name: ub.user.name || ub.user.username || '匿名ユーザー',
        currentPage: ub.currentPage,
        pageCount: ub.book.pageCount,
        status: ub.status,
        updatedAt: ub.updatedAt,
      });
    });

    const sharedNotes = await db.groupNoteShare.findMany({
      where: { groupId },
      include: {
        inspiration: {
          include: {
            user: {
              select: {
                id: true,
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const feedNotes = sharedNotes.map((sn) => sn.inspiration).filter(Boolean);

    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        createdById: group.createdById,
        createdAt: group.createdAt,
      },
      members: group.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name || m.user.username || '不明',
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      books: group.books.map((gb) => ({
        id: gb.id,
        bookId: gb.bookId,
        title: gb.book.title,
        author: gb.book.author,
        coverUrl: gb.book.coverUrl,
        pageCount: gb.book.pageCount,
        googleBooksId: gb.book.googleBooksId,
        progress: progressMap[gb.bookId] || [],
      })),
      notes: feedNotes,
      role: membership.role,
    };
  } catch (error) {
    console.error('Failed to get group details:', error);
    return { error: 'グループ詳細の取得中にエラーが発生しました。' };
  }
}

// 17. Add a book to a group shelf
export async function addBookToGroup(groupId: string, bookId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    });

    if (!membership) return { error: 'グループのメンバーではありません。' };

    const existingGroupBook = await db.groupBook.findUnique({
      where: {
        groupId_bookId: {
          groupId,
          bookId,
        },
      },
    });

    if (existingGroupBook) {
      return { error: 'この本はすでにグループに追加されています。' };
    }

    await db.groupBook.create({
      data: {
        groupId,
        bookId,
        addedById: user.id,
      },
    });

    // Auto share user's own reading status of this book to the group if they have it on shelf
    const userBook = await db.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId,
        },
      },
    });

    if (userBook) {
      await db.groupShare.upsert({
        where: {
          groupId_userBookId: {
            groupId,
            userBookId: userBook.id,
          },
        },
        create: {
          groupId,
          userBookId: userBook.id,
        },
        update: {},
      });
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to add book to group:', error);
    return { error: 'グループへの本の追加に失敗しました。' };
  }
}

// 18. Share user book progress to groups
export async function shareBookToGroups(userBookId: string, groupIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const userBook = await db.userBook.findUnique({
      where: { id: userBookId },
    });

    if (!userBook || userBook.userId !== user.id) {
      return { error: '本棚の書籍データが見つかりません。' };
    }

    // Delete existing shares not in the new groupIds
    await db.groupShare.deleteMany({
      where: {
        userBookId,
        groupId: { notIn: groupIds },
      },
    });

    // Create new shares
    for (const gid of groupIds) {
      await db.groupShare.upsert({
        where: {
          groupId_userBookId: {
            groupId: gid,
            userBookId,
          },
        },
        create: {
          groupId: gid,
          userBookId,
        },
        update: {},
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to share book to groups:', error);
    return { error: 'グループ共有の更新に失敗しました。' };
  }
}

// 19. Share note to groups
export async function shareNoteToGroups(inspirationId: string, groupIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: 'ログインが必要です。' };

  try {
    const inspiration = await db.inspiration.findUnique({
      where: { id: inspirationId },
    });

    if (!inspiration || inspiration.userId !== user.id) {
      return { error: 'インスピレーションノートが見つかりません。' };
    }

    // Delete existing shares not in the new groupIds
    await db.groupNoteShare.deleteMany({
      where: {
        inspirationId,
        groupId: { notIn: groupIds },
      },
    });

    // Create new shares
    for (const gid of groupIds) {
      await db.groupNoteShare.upsert({
        where: {
          groupId_inspirationId: {
            groupId: gid,
            inspirationId,
          },
        },
        create: {
          groupId: gid,
          inspirationId,
        },
        update: {},
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to share note to groups:', error);
    return { error: 'ノートのグループ共有に失敗しました。' };
  }
}
