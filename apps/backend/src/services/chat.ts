import type { UIMessage } from 'ai';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { chats, chatMessages } from '../db/schema.js';
import { logger } from '../config/logger.js';

type ChatType = 'microlearning' | 'discussion';

/**
 * Persist a chat and its messages after an AI response finishes.
 * - Upserts the chat record (creates if first message, updates timestamp otherwise)
 * - Inserts new messages using ON CONFLICT DO NOTHING (idempotent)
 */
export async function saveChat({
  chatId,
  messages,
  userId,
  organizationId,
  type,
}: {
  chatId: string;
  messages: UIMessage[];
  userId: string;
  organizationId: string;
  type: ChatType;
}): Promise<void> {

  try {

    logger.debug({ chatId, messages, userId, organizationId, type }, 'Saving chat...');

    // Upsert chat record
    await db
      .insert(chats)
      .values({
        id: chatId,
        userId,
        organizationId,
        type,
      })
      .onConflictDoUpdate({
        target: chats.id,
        set: { updatedAt: new Date() },
      });

    logger.debug({ chatId, messages, userId, organizationId, type }, 'Chat upserted.');

    // Insert messages (skip any that already exist)
    if (messages.length > 0) {

      logger.debug({ chatId, messages, userId, organizationId, type }, 'Inserting messages...');

      await db
        .insert(chatMessages)
        .values(
          messages.map((msg) => ({
            id: msg.id,
            chatId,
            role: msg.role,
            parts: msg.parts,
          }))
        )
        .onConflictDoNothing({ target: chatMessages.id });

      logger.debug({ chatId, messages, userId, organizationId, type }, 'Messages inserted.');
    }
  } catch (error) {

    logger.error({ error, chatId }, 'Failed to save chat.');

    throw error;
  }
}

/**
 * Load a chat's messages from the database.
 * Returns messages in creation order, formatted as UIMessage[] for useChat initialMessages.
 */
export async function loadChat(chatId: string): Promise<UIMessage[]> {

  logger.debug({ chatId }, 'Loading chat...');

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(chatMessages.createdAt);

  logger.debug({ chatId, rows }, 'Chat loaded.');

  return rows.map((row) => ({
    id: row.id,
    role: row.role as UIMessage['role'],
    parts: row.parts as UIMessage['parts'],
  }));
}
