# AI Assistant Pilot Service (Proto)

사용자 경험을 극대화한 실시간 스트리밍 기반의 AI 채팅 파일럿 서비스입니다.  
OpenRouter API를 통해 다양한 최신 AI 모델(Gemini, GPT 등)을 유연하게 활용하며, 관리자 전용 제어판을 제공합니다.

## 🚀 핵심 기능 (Key Features)

- **실시간 스트리밍 응답:** AI의 답변이 한 글자씩 타자 치듯 실시간으로 렌더링되어 최상의 응답 속도 체감을 제공합니다.
- **다중 모델 폴백(Fallback):** 특정 AI 모델 장애 시 자동으로 차순위 모델을 시도하여 끊김 없는 서비스를 보장합니다.
- **관리자 프롬프트 제어:** 별도의 코드 수정 없이 관리자 페이지에서 실시간으로 '시스템 프롬프트'를 변경하고 적용할 수 있습니다.
- **다국어 지원 (i18n):** 한국어와 영어를 완벽하게 지원하며, 전역 설정에서 간편하게 전환 가능합니다.
- **전체 대화 로그 모니터링:** 관리자는 모든 사용자의 대화 내역을 타임라인 순으로 실시간 모니터링할 수 있습니다.
- **반응형 UI/UX:** 모바일과 데스크탑 환경에 모두 최적화된 Glassmorphism 기반의 세련된 UI를 제공합니다.

## 🛠 기술 스택 (Tech Stack)

- **Frontend:** React 19, TypeScript, Vite, Zustand (상태 관리), Tailwind CSS v4
- **Backend:** Cloudflare Workers (Serverless)
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenRouter API (Gemini 2.0/2.5, OpenAI 호환)
- **Auth:** Supabase Auth (Kakao OAuth 2.0 / Email)

## 📦 설치 및 실행 (Setup)

### 로컬 개발 환경
1. 저장소 클론: `git clone https://github.com/yohan1067/proto.git`
2. 패키지 설치: `npm install`
3. 환경 변수 설정: `.env` 파일에 Supabase 설정값 추가
4. 실행: `npm run dev`

### 배포 (Deployment)
- **Frontend:** Git Push 시 Cloudflare Pages로 자동 배포 (CI/CD 구성 완료)
- **Backend:** `wrangler deploy` 명령어를 통해 Cloudflare Workers에 배포

## ⚙️ 운영 가이드 (Operations)

### 시스템 프롬프트 수정 방법
1. 관리자 계정으로 로그인합니다.
2. 하단 내비게이션의 **[관리자]** 탭을 클릭합니다.
3. **[시스템 프롬프트]** 영역의 텍스트를 수정합니다.
4. **[프롬프트 저장]** 버튼을 누르면 즉시 전체 서비스에 반영됩니다.

### 전체 로그 확인
- 관리자 탭 하단의 **[전체 대화 로그]** 섹션에서 서비스 전체 유저의 대화 이력을 최근순으로 확인할 수 있습니다.

---
**Project Status:** Stable / Active Maintenance
**Maintainer:** [Yohan]