import { embed, embedMany } from 'ai';
import { openai } from '../ai/mastra.js';
import { env } from '../config/env.js';

const getEmbeddingModel = () => openai.embedding(env.OPENAI_EMBEDDING_MODEL);

/**
 * Embed a single text string.
 */
export const embedText = async (text: string): Promise<number[]> => {
  const { embedding } = await embed({ model: getEmbeddingModel(), value: text });
  return embedding;
};

/**
 * Embed multiple texts in a single batched API call.
 */
export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const { embeddings } = await embedMany({ model: getEmbeddingModel(), values: texts });
  return embeddings;
};
