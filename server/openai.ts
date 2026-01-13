import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not found in environment variables');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-demo-key',
});

/**
 * Get completion from OpenAI
 */
export async function getCompletion(
  systemPrompt: string,
  userPrompt: string,
  model: string = process.env.OPENAI_MODEL || 'gpt-4o'
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to get completion from OpenAI');
  }
}

/**
 * Get structured JSON completion from OpenAI
 */
export async function getStructuredCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  responseFormat: { type: 'json_object' } = { type: 'json_object' },
  model: string = process.env.OPENAI_MODEL || 'gpt-4o'
): Promise<T> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt + '\n\nRespond with valid JSON only.' },
        { role: 'user', content: userPrompt },
      ],
      response_format: responseFormat,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content) as T;
  } catch (error) {
    console.error('OpenAI Structured API Error:', error);
    throw new Error('Failed to get structured completion from OpenAI');
  }
}
