import { Hono } from 'hono';
import {
  createDataStreamResponse,
  streamText,
  type UIMessage,
  createIdGenerator,
  convertToModelMessages,
  experimental_generateSpeech as generateSpeech,
  experimental_transcribe as transcribe,
} from 'ai';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { openai, elevenlabs } from '../ai/mastra.js';
import { saveChat } from '../services/chat.js';
import { queryDocuments } from '../services/chromadb.js';
import { db } from '../db/index.js';
import {
  microlearnings,
  microlearningProgress,
  conversationPatterns,
  dnaTopics,
  dnaSubtopics,
  dnaValues,
  userGroupMembers,
  userGroups,
  microlearningSequenceAssignments,
} from '../db/schema.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

const chat = new Hono();

// All chat routes require authentication
chat.use('*', authMiddleware());

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the system prompt for a microlearning chat session.
 */
function buildMLSystemPrompt(
  patternPrompt: string,
  topicName: string | null,
  topicDescription: string | null,
  subtopics: Array<{ name: string; description: string }>,
  dnaKnowledge: string[],
  isCompleted: boolean,
): string {

  const parts: string[] = [patternPrompt];

  if (topicName) {
    parts.push(`\n---\nMICROLEARNING TOPIC: ${topicName}`);
    if (topicDescription) {
      parts.push(topicDescription);
    }
  }

  if (subtopics.length > 0) {
    parts.push('\nLEARNING OBJECTIVES (subtopics to cover):');
    subtopics.forEach((s, i) => {
      parts.push(`${i + 1}. ${s.name}: ${s.description}`);
    });
  }

  if (dnaKnowledge.length > 0) {
    parts.push('\nORGANIZATIONAL KNOWLEDGE (use this as your primary source of truth):');
    dnaKnowledge.forEach((v) => parts.push(`- ${v}`));
  }

  if (isCompleted) {
    parts.push(
      '\nCOMPLETION STATUS: The learner has already completed this microlearning.',
      'You may now answer any questions they have freely, including topics beyond the microlearning.',
    );
  } else {
    parts.push(
      '\nBEHAVIORAL GUIDELINES:',
      '- Guide the learner through ALL learning objectives listed above.',
      '- Use the organizational knowledge above as your primary source of truth.',
      '- Use the searchKnowledge tool to find additional relevant context from organizational documents when needed.',
      '- Keep responses concise, engaging, and adapted to the learner\'s level.',
      '- If the learner asks about topics unrelated to the learning objectives, acknowledge briefly and gently redirect them back.',
      '- Once you are confident that ALL learning objectives have been covered AND the learner demonstrates understanding, call the markLearningComplete tool.',
    );
  }

  return parts.join('\n');
}

const DEFAULT_ML_SYSTEM_PROMPT = `You are a microlearning assistant for workplace training. Your role is to deliver short, focused learning interactions that help employees build skills and retain knowledge.

Guidelines:
- Keep responses concise and focused on the learning objective
- Use simple, clear language
- Ask one question at a time to check understanding
- Provide encouraging but honest feedback
- Adapt to the learner's level based on their responses`;

// ─── POST /chat/ml ─────────────────────────────────────────────────────────────

const mlChatSchema = z.object({
  chatId: z.string().min(1),
  microlearningId: z.string().uuid(),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.record(z.string(), z.unknown())),
  })).min(1),
});

/**
 * POST /chat/ml
 * Streaming chat endpoint for microlearning conversations.
 * - Loads ML context (pattern, topic, subtopics, DNA values)
 * - Provides vector search and completion detection tools
 * - Marks ML as completed when the AI determines all objectives are covered
 */
chat.post('/ml', zValidator('json', mlChatSchema), async (c) => {

  const { chatId, microlearningId } = c.req.valid('json');
  const messages = c.req.valid('json').messages as UIMessage[];
  const auth = c.get('auth');

  // Load the microlearning
  const [ml] = await db
    .select()
    .from(microlearnings)
    .where(and(
      eq(microlearnings.id, microlearningId),
      eq(microlearnings.organizationId, auth.organizationId),
    ))
    .limit(1);

  if (!ml) {
    return c.json({ error: 'Microlearning not found.' }, 404);
  }

  if (ml.status !== 'published' && auth.role !== 'admin') {
    return c.json({ error: 'Microlearning not found.' }, 404);
  }

  // Non-admin users: verify the ML is in an assigned sequence
  if (auth.role !== 'admin' && ml.sequenceId) {

    const groupMemberships = await db
      .select({ groupId: userGroupMembers.groupId })
      .from(userGroupMembers)
      .where(eq(userGroupMembers.userId, auth.userId));

    const isAllGroups = await db
      .select({ id: userGroups.id })
      .from(userGroups)
      .where(and(
        eq(userGroups.organizationId, auth.organizationId),
        eq(userGroups.isAll, true),
      ));

    const relevantGroupIds = [
      ...new Set([
        ...groupMemberships.map((m) => m.groupId),
        ...isAllGroups.map((g) => g.id),
      ]),
    ];

    const [assignment] = relevantGroupIds.length > 0
      ? await db
        .select()
        .from(microlearningSequenceAssignments)
        .where(and(
          eq(microlearningSequenceAssignments.sequenceId, ml.sequenceId),
          inArray(microlearningSequenceAssignments.groupId, relevantGroupIds),
        ))
        .limit(1)
      : [null];

    if (!assignment) {
      return c.json({ error: 'Microlearning not found.' }, 404);
    }
  }

  // Load conversation pattern
  let patternPrompt = DEFAULT_ML_SYSTEM_PROMPT;
  if (ml.patternId) {
    const [pattern] = await db
      .select({ prompt: conversationPatterns.prompt })
      .from(conversationPatterns)
      .where(eq(conversationPatterns.id, ml.patternId))
      .limit(1);
    if (pattern) patternPrompt = pattern.prompt;
  }

  // Load topic, subtopics and DNA values
  let topicName: string | null = null;
  let topicDescription: string | null = null;
  let relevantSubtopics: Array<{ name: string; description: string }> = [];
  let dnaKnowledge: string[] = [];

  if (ml.topicId) {

    const [topic] = await db
      .select()
      .from(dnaTopics)
      .where(eq(dnaTopics.id, ml.topicId))
      .limit(1);

    if (topic) {
      topicName = topic.name;
      topicDescription = topic.description;

      // Get subtopics: if ML specifies subtopicIds, use those; otherwise use all in topic
      const allSubtopics = await db
        .select()
        .from(dnaSubtopics)
        .where(eq(dnaSubtopics.topicId, ml.topicId));

      const subtopicsToUse = (ml.subtopicIds && ml.subtopicIds.length > 0)
        ? allSubtopics.filter((s) => ml.subtopicIds!.includes(s.id))
        : allSubtopics;

      relevantSubtopics = subtopicsToUse.map((s) => ({ name: s.name, description: s.description }));

      // Load approved DNA values for those subtopics
      const subtopicIds = subtopicsToUse.map((s) => s.id);
      if (subtopicIds.length > 0) {
        const values = await db
          .select({ content: dnaValues.content })
          .from(dnaValues)
          .where(and(
            inArray(dnaValues.subtopicId, subtopicIds),
            eq(dnaValues.approval, 'approved'),
          ));
        dnaKnowledge = values.map((v) => v.content);
      }
    }
  }

  // Get or create progress record
  const [existingProgress] = await db
    .select()
    .from(microlearningProgress)
    .where(and(
      eq(microlearningProgress.userId, auth.userId),
      eq(microlearningProgress.microlearningId, microlearningId),
    ))
    .limit(1);

  const isCompleted = existingProgress?.status === 'completed';

  if (!existingProgress) {
    await db
      .insert(microlearningProgress)
      .values({
        userId: auth.userId,
        microlearningId,
        status: 'active',
        openedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // Build system prompt
  const systemPrompt = buildMLSystemPrompt(
    patternPrompt,
    topicName,
    topicDescription,
    relevantSubtopics,
    dnaKnowledge,
    isCompleted,
  );

  // Stream response with tools
  return createDataStreamResponse({
    execute: async (dataStream) => {

      const tools: Record<string, unknown> = {
        searchKnowledge: {
          description: 'Search the organizational knowledge base for additional context relevant to the learner\'s questions.',
          parameters: z.object({
            query: z.string().describe('Search query to find relevant organizational knowledge'),
          }),
          execute: async ({ query }: { query: string }) => {
            try {
              const results = await queryDocuments(query, auth.organizationId, 5);
              const docs = results.documents.filter(Boolean) as string[];
              if (docs.length === 0) return 'No additional relevant information found.';
              return docs.join('\n\n');
            } catch (err) {
              logger.warn({ err }, 'Vector search failed during ML chat.');
              return 'Knowledge search unavailable.';
            }
          },
        },
      };

      // Only add completion tool if ML is not already completed
      if (!isCompleted) {
        tools.markLearningComplete = {
          description: 'Call this tool when ALL learning objectives have been covered and the learner demonstrates sufficient understanding. This marks the microlearning as completed.',
          parameters: z.object({
            summary: z.string().describe('Brief summary of what the learner covered and demonstrated understanding of'),
          }),
          execute: async ({ summary }: { summary: string }) => {
            try {
              await db
                .update(microlearningProgress)
                .set({ status: 'completed', completedAt: new Date() })
                .where(and(
                  eq(microlearningProgress.userId, auth.userId),
                  eq(microlearningProgress.microlearningId, microlearningId),
                ));

              // Signal completion to the frontend via data stream
              dataStream.writeData({ type: 'ml_completed', microlearningId });

              logger.info({ userId: auth.userId, microlearningId }, 'Microlearning marked as completed.');

              return `Great work! ${summary}`;
            } catch (err) {
              logger.error({ err, userId: auth.userId, microlearningId }, 'Failed to mark ML as completed.');
              return 'Unable to record completion at this time.';
            }
          },
        };
      }

      const result = streamText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
        maxSteps: 3,
        tools: tools as Parameters<typeof streamText>[0]['tools'],
        onFinish: ({ messages: updatedMessages }) => {
          saveChat({
            chatId,
            messages: updatedMessages,
            userId: auth.userId,
            organizationId: auth.organizationId,
            type: 'microlearning',
            microlearningId,
          }).catch((err) => {
            logger.error({ err, chatId }, 'Failed to persist ML chat after stream finish.');
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => {
      logger.error({ error }, 'ML chat stream error.');
      return 'An error occurred. Please try again.';
    },
  });
});

// ─── POST /chat/assistant ──────────────────────────────────────────────────────

const ASSISTANT_SYSTEM_PROMPT = `You are a helpful assistant. Answer questions clearly and concisely. You have access to organizational knowledge through the searchKnowledge tool — use it when answering questions that may relate to the organization's documented knowledge.`;

const assistantChatSchema = z.object({
  chatId: z.string().min(1),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.record(z.string(), z.unknown())),
  })).min(1),
});

/**
 * POST /chat/assistant
 * Streaming chat endpoint for free-form assistant conversations.
 * Includes vector search tool for accessing organizational knowledge.
 */
chat.post('/assistant', zValidator('json', assistantChatSchema), async (c) => {

  const { chatId } = c.req.valid('json');
  const messages = c.req.valid('json').messages as UIMessage[];
  const auth = c.get('auth');

  const result = streamText({
    model: openai('gpt-4o'),
    system: ASSISTANT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    maxSteps: 2,
    tools: {
      searchKnowledge: {
        description: 'Search the organizational knowledge base for information relevant to the user\'s question.',
        parameters: z.object({
          query: z.string().describe('Search query to find relevant organizational knowledge'),
        }),
        execute: async ({ query }) => {
          try {
            const results = await queryDocuments(query, auth.organizationId, 5);
            const docs = results.documents.filter(Boolean) as string[];
            if (docs.length === 0) return 'No relevant organizational knowledge found.';
            return docs.join('\n\n');
          } catch (err) {
            logger.warn({ err }, 'Vector search failed during assistant chat.');
            return 'Knowledge search unavailable.';
          }
        },
      },
    },
    onFinish: ({ messages: updatedMessages }) => {
      saveChat({
        chatId,
        messages: updatedMessages,
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'discussion',
      }).catch((error) => {
        logger.error({ error, chatId }, 'Failed to persist assistant chat after stream finish.');
      });
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
  });
});

// ─── POST /chat/tts ────────────────────────────────────────────────────────────

const ttsSchema = z.object({
  text: z.string().min(1).max(4000),
  voiceId: z.string().min(1).optional(),
});

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs "Rachel"

/**
 * POST /chat/tts
 * Convert text to speech using ElevenLabs and stream back MP3 audio.
 */
chat.post('/tts', zValidator('json', ttsSchema), async (c) => {

  if (!env.ELEVENLABS_API_KEY) {
    return c.json({ error: 'TTS is not configured on this server.' }, 400);
  }

  const { text, voiceId = DEFAULT_VOICE_ID } = c.req.valid('json');

  try {

    const result = await generateSpeech({
      model: elevenlabs.speech('eleven_multilingual_v2'),
      text,
      voice: voiceId,
    });

    return new Response(result.audio.uint8Array, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {

    logger.error({ error }, 'TTS synthesis failed.');

    return c.json({ error: 'Failed to synthesize speech.' }, 500);
  }
});

// ─── POST /chat/transcribe ─────────────────────────────────────────────────────

/**
 * POST /chat/transcribe
 * Transcribe an audio file to text using ElevenLabs scribe_v1.
 * Accepts multipart/form-data with an `audio` field.
 */
chat.post('/transcribe', async (c) => {

  if (!env.ELEVENLABS_API_KEY) {
    return c.json({ error: 'Transcription is not configured on this server.' }, 400);
  }

  try {

    const body = await c.req.parseBody();
    const file = body['audio'] as File | undefined;

    if (!file) {
      return c.json({ error: 'No audio file provided.' }, 400);
    }

    const result = await transcribe({
      model: elevenlabs.transcription('scribe_v1'),
      audio: new Uint8Array(await file.arrayBuffer()),
      providerOptions: {
        elevenlabs: { languageCode: 'en' },
      },
    });

    return c.json({ text: result.text });

  } catch (error) {

    logger.error({ error }, 'Transcription failed.');

    return c.json({ error: 'Failed to transcribe audio.' }, 500);
  }
});

export default chat;
