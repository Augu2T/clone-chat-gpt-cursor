# 요구사항

## 프로젝트 목표

Chat GPT와 유사한 채팅 AI Application 구현하는 것입니다.

## 사용하는 기술 스택

- UI 라이브러리
  - TailwindCSS : https://tailwindcss.com/
  - shadcn/ui : https://ui.shadcn.com/
- AI SDK
  - AI SDK : https://ai-sdk.dev/docs/introduction

## 구현 단계

아래 단계는 App Router + AI SDK 기반 채팅 앱을 “실행 가능” 상태로 만드는 상세 절차다. 각 단계는 목표/수행 작업/검증 기준을 포함하며, 파일 경로와 명령을 명시한다.

### Step1. 프로젝트 초기 설치, 필요한 라이브러리 셋팅

- 목표
  - Next.js(App Router) 기반 프로젝트를 로컬에서 실행 가능하게 만든다.
  - TailwindCSS와 shadcn/ui를 적용하고 기본 UI 토대를 구성한다.

- 수행 작업
  1) 의존성 설치
     - 명령:
       - `npm install`
     - 확인: `node_modules/` 생성, `npm run dev`가 에러 없이 실행.

  2) TailwindCSS 초기화
     - 파일: `globals.css`에 Tailwind 지시자(`@tailwind base; @tailwind components; @tailwind utilities;`) 포함되어 있는지 확인.
     - 파일: `postcss.config.mjs`와 `tailwind.config`가 존재/유효한지 확인. 없으면 Tailwind 공식 가이드에 따라 생성.

  3) shadcn/ui 설치 및 기본 컴포넌트 확인
     - 파일: `components/ui/button.tsx`가 존재하고 정상 빌드되는지 확인.
     - 이 버튼 컴포넌트를 이후 입력폼 전송 버튼으로 재사용한다.

  4) App Router 기본 골격 점검
     - 파일: `app/layout.tsx` 레이아웃에 `globals.css`가 임포트되어 있는지 확인.
     - 파일: `app/page.tsx`가 접속 루트(`/`)에 렌더링되는지 확인.

- 검증 기준
  - `npm run dev` 실행 시 브라우저에서 `/` 페이지가 스타일 포함 정상 렌더링.
  - 빌드: `npm run build`가 오류 없이 통과.

---

### Step2. App Router의 API Router 핸들러 구현

- 목표
  - `POST /api/chat` 엔드포인트에서 사용자 메시지를 받아 AI SDK로 모델을 호출하고 스트리밍 텍스트를 반환한다.

- 수행 작업
  1) 환경 변수 준비
     - `.env.local`에 필수 키를 등록:
       - `OPENAI_API_KEY=...`
       - 선택: `AI_MODEL=gpt-4o-mini` (미지정 시 코드의 기본값 사용)
     - 주의: 환경 변수는 클라이언트에 노출 금지(서버에서만 사용).

  2) AI 클라이언트 헬퍼 정의
     - 파일: `lib/ai.ts`
     - 역할: 모델명/옵션을 중앙집중 설정하고, 라우트에서 재사용.
     - 예시(개념):
       - `export const defaultModel = process.env.AI_MODEL ?? 'gpt-4o-mini'`
       - 필요 시 AI SDK의 클라이언트/헬퍼를 생성해 export.

  3) 라우트 작성
     - 파일: `app/api/chat/route.ts`
     - 요구사항:
       - 요청 바디 스키마: `{ messages: Array<{ role: 'system'|'user'|'assistant', content: string }> }`
       - 응답: 스트리밍 텍스트(토큰 단위). Content-Type은 `text/event-stream` 또는 스트리밍 가능한 방식.
       - 에러 처리: 잘못된 요청(400), 인증/할당량 오류(401/429), 기타 서버 오류(500) 구분.
     - 구현 가이드(개념):
       - 요청 바디 파싱 → 메시지 유효성 검사(최소 1개 user 메시지) → AI SDK 호출(stream) → 스트림을 응답에 파이프.
       - 종료/에러 시 스트림 닫기.

  4) cURL로 수동 검증
     - 명령:
       - `curl -N -X POST http://localhost:3002/api/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"안녕\"}]}"`

- 검증 기준
  - cURL로 호출 시 콘솔에 토큰이 순차 출력(스트림)되고 서버 로그에 오류 없음.
  - 잘못된 요청 바디 전송 시 400을 반환.

---

### Step3. 프론트엔드와 API 연동

- 목표
  - 입력 → 전송 → `/api/chat` 스트리밍 수신 → 메시지 목록 업데이트 흐름을 구현한다.

- 수행 작업
  1) 상태 모델 정의
     - 파일: `app/page.tsx`
     - 상태:
       - `messages: Array<{ id: string; role: 'user'|'assistant'; content: string; createdAt: number }>`
       - `input: string`
       - `isLoading: boolean`
     - 규칙:
       - 전송 시 `user` 메시지를 `messages`에 즉시 추가.
       - `assistant` 메시지는 스트리밍 수신 중 누적 업데이트.

  2) 입력 핸들러
     - 엔터 전송(Shift+Enter 줄바꿈) 로직.
     - 전송 버튼 클릭과 동일한 동작으로 위임.

  3) API 요청/스트리밍 수신
     - `fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages }) })`
     - ReadableStream 읽기 루프:
       - `const reader = response.body?.getReader()`
       - `while(true) { const { value, done } = await reader.read(); if(done) break; ... }`
       - 수신된 청크를 텍스트로 디코딩 → 마지막 `assistant` 메시지에 이어붙임(없으면 새로 추가).
     - 로딩/에러 상태 반영:
       - 전송 직후 `isLoading = true`, 완료/에러 시 `false`.
       - 오류 발생 시 사용자 안내 메시지 표시.

  4) 자동 스크롤
     - 새 토큰 누적 시 마지막 메시지로 스크롤.
     - 긴 응답에서도 프레임 드랍 최소화(요청 애니메이션 프레임 or 청크 배치).

  5) UI 구성
     - `components/ui/button.tsx`를 전송 버튼으로 사용.
     - 역할별 메시지 버블 스타일링(좌/우 정렬, 배경 구분).

- 검증 기준
  - AI SDK 6버전 : https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
  - 사용자가 텍스트를 전송하면 3초 이내 첫 글자가 화면에 표시.
  - 스트리밍 중에도 입력창 사용 가능(UX 끊김 없음).
  - 네트워크 오류 시 안내 문구 노출.

---

### Step4. UI 컴포넌트 구현

- 목표
  - 접근성/반응형을 갖춘 최소 채팅 UI 컴포넌트를 완성한다.

- 수행 작업
  1) 메시지 리스트
     - 요구:
       - 역할에 따라 다른 정렬/색상.
       - 긴 텍스트 줄바꿈 처리, 코드블록/링크 기본 스타일(필요 시).
       - 리스트 끝에 로딩 인디케이터(도트/스켈레톤) 표시.

  2) 입력바
     - 멀티라인 `textarea` + 전송 버튼.
     - 키보드 접근성: `aria-label`, `Enter`/`Shift+Enter` 동작 명확화.

  3) 공통 레이아웃
     - 모바일 우선 디자인, 데스크톱에서 여백/최대폭 설정.
     - 다크 모드 지원은 선택(가능하면 Tailwind `dark:` 유틸 사용).

- 검증 기준
  - 모바일/데스크톱에서 레이아웃 깨짐 없음.
  - 스크린리더 접근성 기본 속성 제공.
  - UI Reference : https://www.bing.com/images/search?view=detailV2&ccid=mW3k9ucB&id=A60FC09AE7287BA33BA6479BCBC664D40B097A7D&thid=OIP.mW3k9ucBCwhn42QoYxSoOQHaHa&mediaurl=https%3a%2f%2fs3-alpha.figma.com%2fhub%2ffile%2f3498235414%2fcf144f68-87b7-4eff-b77a-f4a17230bc9e-cover.png&exph=1394&expw=1394&q=chat+ui+figma+reference&FORM=IRPRST&ck=93AD1D86E0EE10AD4E953C7CDB8A2C3B&selectedIndex=19&itb=0

---

### Step5. Vercel 배포

- 목표
  - 동일한 동작을 배포 환경에서 재현하며, 환경 변수만 설정하면 바로 동작한다.

- 수행 작업
  1) GitHub 연결 및 Vercel Import Project
  2) 환경 변수 설정
     - `OPENAI_API_KEY`, 선택 `AI_MODEL`
     - 빌드/런타임 모두 서버 노출만 허용
  3) 빌드 및 동작 확인
     - `/api/chat`에 cURL 요청으로 스트림 확인
     - 웹 UI에서 실제 대화 테스트

- 검증 기준
  - 배포 URL에서 로컬과 동일한 스트리밍 UX.
  - 4xx/5xx 응답 시 에러 안내 문구 노출.

---

### 에러 처리/로깅(공통 지침)

- 입력 검증 실패: 400(JSON `{ error: 'BadRequest', message }`)
- 인증/할당량: 401/429
- 내부 오류: 500(JSON `{ error: 'InternalError', requestId? }`)
- 서버 로그에는 PII 포함 금지, 스택은 내부에서만 확인.

---

### 수용 기준(최종)

- 텍스트 전송 후 3초 내 최초 토큰 표시(정상 네트워크).
- 자동 스크롤, 긴 응답에서도 UI 끊김 없음.
- 배포 환경(Vercel)에서 동일 재현 가능.