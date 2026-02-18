import { Hono } from 'hono';
import { streamText, type UIMessage, createIdGenerator, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { openai } from '../ai/mastra.js';
import { saveChat } from '../services/chat.js';
import { logger } from '../config/logger.js';

const chat = new Hono();

// All chat routes require authentication
chat.use('*', authMiddleware());

//TODO Change this
const ML_SYSTEM_PROMPT = `You are a microlearning assistant for workplace training. Your role is to deliver short, focused learning interactions that help employees build skills and retain knowledge.

Guidelines:
- Keep responses concise and focused on the learning objective
- Use simple, clear language
- Ask one question at a time to check understanding
- Provide encouraging but honest feedback
- Adapt to the learner's level based on their responses`;

const mlChatSchema = z.object({
  chatId: z.string().min(1),
  // parts is a complex discriminated union in the AI SDK — validate shape loosely and cast
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.record(z.string(), z.unknown())),
  })).min(1),
});

/**
 * POST /chat/ml
 * Streaming chat endpoint for microlearning conversations.
 * Compatible with the useChat hook from the Vercel AI SDK.
 */
chat.post('/ml', async (c) => {

  const body = await c.req.json();
  const parsed = mlChatSchema.safeParse(body);

  if (!parsed.success) {

    logger.debug({ issues: parsed.error.issues }, 'Invalid /chat/ml request body.');

    return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400);
  }

  const { chatId } = parsed.data;
  const messages = parsed.data.messages as UIMessage[];

  // Get auth context
  const auth = c.get('auth');

  // Stream text
  const result = streamText({
    model: openai('gpt-4o'),
    system: ML_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  // Return stream response
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
    onFinish: ({ messages: updatedMessages }) => {
      saveChat({
        chatId,
        messages: updatedMessages,
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'microlearning',
      }).catch((error) => {
        logger.error({ error, chatId }, 'Failed to persist chat after stream finish.');
      });
    },
  });
});

export default chat;
