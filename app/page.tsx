'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// 프로필 아바타 컴포넌트
function Avatar({ name, isUser = false }: { name: string; isUser?: boolean }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex items-center justify-center rounded-full text-sm font-medium shrink-0 ${isUser
        ? 'bg-[#FFB84D] text-black w-8 h-8'
        : 'bg-gray-400 text-white w-8 h-8'
        }`}
    >
      {initials || 'AI'}
    </div>
  );
}

// 타임스탬프 포맷팅
function formatTime(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export default function Home() {
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageTimestamps = useRef<Map<string, Date>>(new Map());

  // 자동 스크롤
  useEffect(() => {
    if (status === 'streaming' || status === 'ready') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, status]);

  // 텍스트 영역 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      sendMessage({ text: input });
      setInput('');
    }
  };

  // 메시지 타임스탬프 관리
  useEffect(() => {
    messages.forEach((message) => {
      if (!messageTimestamps.current.has(message.id)) {
        messageTimestamps.current.set(message.id, new Date());
      }
    });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#2C2C2E] text-white">
      {/* 헤더 */}
      <header className="bg-[#1C1C1E] border-b border-[#3A3A3C] px-4 py-3 flex items-center gap-3">
        <Avatar name="AI Assistant" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">AI Assistant</h1>
          <p className="text-xs text-gray-400">Online</p>
        </div>
        <button
          className="text-gray-400 hover:text-white p-2"
          aria-label="메뉴"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="10" cy="4" r="1.5" fill="currentColor" />
            <circle cx="10" cy="10" r="1.5" fill="currentColor" />
            <circle cx="10" cy="16" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-center">
              메시지를 입력하여 대화를 시작하세요.
            </p>
          </div>
        )}

        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const messageDate = messageTimestamps.current.get(message.id) || new Date();
          const prevMessageDate = index > 0
            ? messageTimestamps.current.get(messages[index - 1].id) || new Date()
            : null;
          const showAvatar =
            index === 0 ||
            messages[index - 1].role !== message.role ||
            (prevMessageDate && messageDate.getTime() - prevMessageDate.getTime() > 300000); // 5분 이상 차이

          return (
            <div
              key={message.id}
              className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <Avatar name="AI Assistant" />
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}

              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 ${isUser
                    ? 'bg-[#FFB84D] text-black'
                    : 'bg-[#E5E5EA] text-black'
                    }`}
                >
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.parts.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return <span key={partIndex}>{part.text}</span>;
                      }
                      return null;
                    })}
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1 px-1">
                  {formatTime(messageDate)}
                </span>
              </div>

              {isUser && (
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <Avatar name="You" isUser />
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 로딩 인디케이터 */}
        {(status === 'submitted' || status === 'streaming') && (
          <div className="flex gap-2 justify-start">
            <div className="flex-shrink-0">
              <Avatar name="AI Assistant" />
            </div>
            <div className="bg-[#E5E5EA] rounded-2xl px-4 py-3">
              <div className="flex space-x-1.5">
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 max-w-[80%]">
              <p className="mb-2 text-sm">오류가 발생했습니다.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMessages([]);
                  messageTimestamps.current.clear();
                }}
                className="w-full text-sm"
              >
                대화 초기화
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <button
            type="button"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-[#FFB84D] flex items-center justify-center hover:bg-[#FFA726] transition-colors"
            aria-label="첨부"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 4V16M4 10H16"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={status !== 'ready'}
              placeholder="Type Message"
              className="w-full min-h-[44px] max-h-[120px] px-4 py-2.5 bg-gray-100 border-0 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-[#FFB84D] disabled:opacity-50 disabled:cursor-not-allowed text-black placeholder-gray-500 text-sm"
              rows={1}
              aria-label="메시지 입력"
            />
          </div>

          <button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-[#FFB84D] flex items-center justify-center hover:bg-[#FFA726] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="메시지 전송"
          >
            {status === 'streaming' ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-spin"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="32"
                  strokeDashoffset="24"
                />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 17L17 10L3 3V8L12 10L3 12V17Z"
                  fill="black"
                />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
