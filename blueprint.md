# AI Chat App Blueprint

## Project Overview
React + TypeScript + Vite 기반의 현대적인 AI 채팅 애플리케이션입니다. Cloudflare Workers와 D1 Database를 백엔드로 사용하며, Google Gemini 2.5 Flash 모델을 통해 지능적인 답변을 제공합니다.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS v4, i18next, Lucide React (Material Symbols)
- **Backend**: Cloudflare Workers, Prisma (with D1 adapter)
- **Database**: Cloudflare D1
- **Auth**: Kakao OAuth 2.0, JWT (Access/Refresh Tokens)
- **AI**: Google Gemini API (gemini-2.5-flash)

## Implemented Features
### 1. Visual Design & UI
- **Landing Page**: AI Orb 애니메이션과 Space Grotesk 폰트를 사용한 세련된 다크 테마.
- **Chat Interface**: Glassmorphism 디자인이 적용된 말풍선, 자동 스크롤, 메시지 애니메이션.
- **History Screen**: 메쉬 그라데이션 배경, 대화 검색 기능, 카드 스타일의 대화 목록.
- **Navigation**: 하단 탭 바를 통한 채팅/기록 화면 전환.

### 2. Core Functionality
- **Multi-language Support**: 한국어 및 영어 지원 (브라우저 언어 감지 및 수동 전환).
- **AI Interaction**: Gemini API 연동을 통한 실시간 질문 및 답변.
- **History Management**: 모든 대화 내용을 데이터베이스에 저장하고 불러오기.
- **Authentication**: 카카오 계정을 통한 간편 로그인 및 토큰 기반 인증 유지.

## Deployment Information
- **Frontend URL**: https://proto-9ff.pages.dev
- **Backend URL**: https://proto-backend.yohan1067.workers.dev

## Current Status & Next Steps
- [x] UI 개편 및 다국어 적용 완료
- [x] 대화 기록 및 네비게이션 구현 완료
- [x] Cloudflare 배포 완료
- [ ] 프로필 설정 및 테마 커스터마이징 기능 (예정)
- [ ] 탐색(Explore) 탭 기능 정의 및 구현 (예정)
