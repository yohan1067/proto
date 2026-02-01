# Gemini AI Assistant Blueprint

## Project Overview
React + TypeScript + Vite 기반의 현대적인 AI 채팅 애플리케이션입니다. Cloudflare Workers와 D1 Database를 백엔드로 사용하며, OpenRouter AI를 통해 다양한 고성능 AI 모델의 답변을 제공합니다.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS v4, i18next, Material Symbols
- **Backend**: Cloudflare Workers (Native D1 SQL)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Kakao OAuth 2.0)
- **AI**: OpenRouter AI (Gemini 2.0 Flash, Llama 3.3, Gemma 3 등 다중 모델 폴백)

## Implemented Features
### 1. Visual Design & UI
- **Landing Page**: AI Orb 애니메이션과 다크 테마 디자인.
- **Chat Interface**: Glassmorphism 말풍선, 자동 스크롤, 메시지 복사, 모바일 최적화 레이아웃.
- **Navigation**: 하단 탭 바 (Chat, History, Profile, Admin).
- **Favicon**: AI Orb 디자인의 커스텀 SVG 파비콘.
- **Feedback**: 커스텀 인증 모달 및 유니버설 알림 시스템.

### 2. Core Functionality
- **Multi-language**: 한국어/영어 완벽 지원 및 자동 감지.
- **AI Chat**: OpenRouter 기반의 리전 제한 없는 무제한 대화 환경 (60초 타임아웃).
- **User Management**: 닉네임 수정 및 데이터 완전 삭제(회원 탈퇴).
- **History**: 대화 기록 저장, 검색 및 복구.
- **Admin**: 실시간 시스템 프롬프트 수정 및 전체 회원 목록 조회 (USER/ADMIN 구분).

### 3. Reliability & Security
- **Infrastructure**: Prisma 제거 후 Supabase SDK 직접 연동으로 전환하여 속도 최적화.
- **Security**: API 키(OpenRouter, Supabase)를 Cloudflare Secrets 및 환경 변수로 관리.
- **Robustness**: 비정상 응답 시 HTML 대신 항상 JSON 반환하도록 설계.

## Deployment Information
- **Frontend URL**: https://proto-9ff.pages.dev
- **Backend URL**: https://proto-backend.yohan1067.workers.dev

## Current Status
- [x] UI/UX 및 다국어 지원 완료
- [x] OpenRouter AI 백엔드 통합 완료 (리전 이슈 해결)
- [x] 프로필 관리 및 관리자 기능 완료
- [x] 대화 기록 및 성능 최적화 완료
