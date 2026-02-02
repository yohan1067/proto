# AI Assistant Pilot Service (Proto) - Blueprint

## Project Overview
사용자 경험을 극대화한 실시간 스트리밍 기반의 AI 채팅 파일럿 서비스입니다.  
GitHub 저장소와 Cloudflare(Pages & Workers)를 연동하여 완벽한 자동 배포(CI/CD) 환경을 구축했습니다.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Zustand (전역 상태 관리), Tailwind CSS v4, i18next
- **Backend**: Cloudflare Workers (Serverless, Streaming SSE)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Kakao OAuth 2.0 / Email)
- **AI**: OpenRouter API (Gemini 2.0/2.5 Flash & Pro Fallback 지원)

## Implemented Features
### 1. Visual Design & UI
- **Landing Page**: AI Orb 애니메이션과 다크 테마 디자인.
- **Chat Interface**: Glassmorphism 디자인, 실시간 스트리밍 답변, 자동 스크롤, 메시지 복사(Fallback 지원).
- **Navigation**: 하단 탭 바 (Chat, History, Profile, Admin).
- **Loading UX**: Skeleton UI 적용 (History 탭), AI 답변 생성 시 "..." 애니메이션.
- **Responsive**: 모바일 로고 겹침 문제 해결 및 최적화된 레이아웃.

### 2. Core Functionality
- **Streaming Response**: SSE(Server-Sent Events)를 통한 실시간 답변 출력.
- **Model Fallback**: 다중 모델 시도를 통한 서비스 안정성 확보.
- **History**: 대화 기록 저장, 검색 및 복구 기능 (HistoryTab 분리).
- **Profile**: 닉네임 수정, 언어 변경(한/영), 로그아웃 및 회원 탈퇴.
- **Admin**: 실시간 시스템 프롬프트 수정 및 서비스 전체 대화 로그 모니터링.

### 3. Architecture & Reliability
- **Clean Code**: 모든 UI 요소를 `src/components`로 분리하고, 비즈니스 로직은 `src/hooks` (useChat, useAuthInit)로 캡슐화.
- **State Management**: Zustand를 사용하여 `Auth`, `Chat`, `UI` 상태를 전역적으로 깔끔하게 관리.
- **Security**: API 키 및 보안 정보는 Cloudflare Secrets 및 환경 변수로 철저히 분리.

## Deployment Information
- **Deployment Policy**: **Git Push Only (CI/CD)**. 수동 배포 지양.
- **Frontend (Pages)**: `proto-9ff` (URL: https://proto-9ff.pages.dev)
- **Backend (Workers)**: `proto-backend` (Entry: `server/index.ts`)

## Project Status: Stable / Full Automation
- 모든 요구사항이 충족되었으며, 자동화된 배포 환경에서 안정적으로 운영 중입니다.