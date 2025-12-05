import { openai } from '@ai-sdk/openai';

// Centralized AI configuration used across the app
const defaultModel = process.env.AI_MODEL ?? 'gpt-4o-mini';

// 환경 변수 확인
if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. The chat API will fail.');
}

export const chatModel = openai(defaultModel);
export const systemPrompt = 'You are a helpful assistant.';

// 채팅 설정
export const chatConfig = {
  temperature: 0.7,
  max_tokens: 1000,
}
