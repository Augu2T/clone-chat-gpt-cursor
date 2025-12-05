import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { chatModel, systemPrompt } from '@/lib/ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // 메시지 유효성 검사
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'BadRequest', message: 'Messages array is required and must not be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 최소 1개의 user 메시지 확인
    const hasUserMessage = messages.some(msg => msg.role === 'user');
    if (!hasUserMessage) {
      return new Response(
        JSON.stringify({ error: 'BadRequest', message: 'At least one user message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = streamText({
      model: chatModel,
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat API error:', error);

    // 인증 오류 처리
    if (error?.status === 401) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid API key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 할당량 오류 처리
    if (error?.status === 429) {
      return new Response(
        JSON.stringify({ error: 'TooManyRequests', message: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 기타 서버 오류
    return new Response(
      JSON.stringify({ error: 'InternalError', message: 'An error occurred while processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

