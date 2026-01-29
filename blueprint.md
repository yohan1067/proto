# Gemini AI Assistant Blueprint

## Project Overview
React + TypeScript + Vite 기반의 현대적인 AI 채팅 애플리케이션입니다. Cloudflare Workers와 D1 Database를 백엔드로 사용하며, Google Gemini API를 통해 지능적인 답변을 제공합니다.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS v4, i18next, Material Symbols
- **Backend**: Cloudflare Workers (Native D1 SQL)
- **Database**: Cloudflare D1
- **Auth**: Kakao OAuth 2.0, JWT (Access/Refresh Tokens)
- **AI**: Google Gemini API (gemini-2.5-flash, 2.0-flash fallback)

## Implemented Features
### 1. Visual Design & UI
- **Landing Page**: AI Orb 애니메이션이 포함된 다크 테마 디자인.
- **Chat Interface**: Glassmorphism 스타일의 말풍선, 자동 스크롤, 메시지 복사 기능.
- **Navigation**: 하단 탭 바 (Chat, History, Admin, Profile).
- **Favicon**: AI Orb 디자인의 커스텀 SVG 파비콘 적용.

### 2. Core Functionality
- **Multi-language**: 한국어/영어 완벽 지원 및 자동 감지.
- **AI Chat**: 다중 모델 재시도 로직 (Quota/Region 이슈 대응) 및 시스템 프롬프트 적용.
- **User Management**: 닉네임 수정 및 회원 탈퇴 (데이터 완전 삭제).
- **History**: 대화 기록 저장, 검색 및 이전 대화 다시 보기.
- **Admin**: 실시간 시스템 프롬프트 수정 및 전체 회원 목록 조회.

### 3. Reliability & Performance
- **Performance**: Prisma 제거 후 Native SQL 전환으로 504 타임아웃 해결.
- **Security**: 모든 민감한 키(Gemini, Kakao, JWT)를 Cloudflare Secrets로 관리.
- **UX**: 로그인 로딩 상태 표시, 30초 요청 타임아웃, 리전 에러 한국어 안내.

## Deployment Information
- **Frontend URL**: https://proto-9ff.pages.dev
- **Backend URL**: https://proto-backend.yohan1067.workers.dev

## Current Status
- [x] UI/UX 및 다국어 지원 완료
- [x] 백엔드 성능 최적화 및 보안 강화 완료
- [x] 프로필 관리 및 관리자 기능 완료
- [x] 대화 기록 및 검색 기능 완료