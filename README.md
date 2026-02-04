# 🤖 Proto AI - 차세대 멀티모달 AI 채팅 플랫폼 (v1.0)

2026년 최신 기술 스택으로 구축된, 강력하고 직관적인 AI 채팅 애플리케이션입니다. 단순한 텍스트 대화를 넘어 이미지 분석, 음성 인터페이스, 세션 관리 기능을 모두 갖춘 올인원 플랫폼입니다.

## 🚀 주요 기능 (Key Features)

### 1. ⚡ 실시간 스트리밍 채팅
*   **Gemini 3 기반 엔진**: OpenRouter를 통한 최신 Google Gemini 모델 폴백 시스템 구축.
*   **끊김 없는 스트리밍**: SSE(Server-Sent Events)를 통한 실시간 답변 생성 및 렌더링.
*   **마크다운 지원**: 코드 하이라이팅, 테이블, 리스트 등 풍부한 텍스트 표현.

### 2. 🖼️ 스마트 멀티모달 (Vision)
*   **이미지 분석**: 사진을 업로드하여 AI와 시각적 대화 가능.
*   **Cloudflare R2 연동**: 고성능 오브젝트 스토리지를 통한 안전한 이미지 관리.
*   **자동 최적화**: 업로드 전 프론트엔드에서 1MB 이하로 지능형 이미지 압축.
*   **드래그 앤 드롭**: PC 환경에서 직관적인 파일 업로드 경험 제공.

### 3. 🎙️ 보이스 인터페이스
*   **STT (Speech-to-Text)**: 마이크 입력으로 손쉽게 질문 전송.
*   **TTS (Text-to-Speech)**: AI의 답변을 자연스러운 한국어 목소리로 청취.

### 4. 📂 멀티 세션 및 히스토리
*   **채팅방 관리**: 주제별로 무제한 채팅방 생성 및 사이드바 목록 관리.
*   **썸네일 히스토리**: 대화 목록에서 이미지 썸네일을 함께 제공하여 직관적인 확인 가능.
*   **자동 저장**: 대화 종료 시 백엔드에서 안전하게 데이터베이스 저장.

### 5. 🛠️ 관리자 대시보드 (Admin)
*   **독립된 페이지**: `/admin` 경로의 전용 관리자 인터페이스.
*   **시스템 제어**: 실시간 시스템 프롬프트 수정 및 반영.
*   **통계 및 모니터링**: 사용자 현황 및 전체 대화 로그 실시간 모니터링.

## 🛠️ 기술 스택 (Tech Stack)

*   **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
*   **State Management**: Zustand
*   **Backend**: Cloudflare Workers (TypeScript)
*   **Database**: Supabase (PostgreSQL)
*   **Storage**: Cloudflare R2
*   **AI API**: OpenRouter (Gemini 3, Gemini 2.0 Flash)
*   **Testing**: Vitest, React Testing Library

## 🛡️ 보안 및 최적화 (Security & Optimization)

*   **CORS 보안**: 허용된 도메인(`proto-9ff.pages.dev`, `localhost`)만 API 접근 허용.
*   **입력 검증**: 프롬프트 길이 제한(3000자) 및 파일 타입 검증.
*   **보안 헤더**: HSTS, CSP, X-Frame-Options 등 최신 보안 표준 준수.
*   **성능 최적화**: 백엔드 스트림 버퍼링 도입 및 프론트엔드 미사용 코드 전수 제거.

---
**Developed with Smart Autonomy by Gemini CLI.**
본 프로젝트는 모든 권한을 가진 AI 에이전트에 의해 자율적으로 최적화 및 구축되었습니다.
