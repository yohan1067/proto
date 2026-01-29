import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "hero_title": "Ask Anything with AI",
      "hero_subtitle": "Your sophisticated companion for instant answers and creative insights.",
      "login_kakao": "Log in with Kakao",
      "logging_in": "Logging in...",
      "loading_profile": "Loading your profile...",
      "terms_prefix": "By continuing, you agree to our ",
      "terms": "Terms",
      "and": " and ",
      "privacy": "Privacy",
      "welcome": "Welcome",
      "logout": "Logout",
      "ask_placeholder": "Ask me anything...",
      "help_label": "How can I help you?",
      "ask_button": "Ask AI",
      "thinking": "Thinking...",
      "ai_response": "AI Response",
      "footer_text": "Powered by Google Gemini 2.5 Flash",
      "ai_name": "AI",
      "you": "You",
      "just_now": "Just now",
      "suggestion_poem": "Write a poem",
      "suggestion_coding": "Coding help",
      "suggestion_summarize": "Summarize text",
      "copy": "Copy",
      "copied": "Copied!",
      "history_title": "History",
      "search_placeholder": "Search conversations...",
      "today": "Today",
      "yesterday": "Yesterday",
      "nav_chat": "Chat",
      "nav_history": "History",
      "nav_explore": "Explore",
      "nav_profile": "Profile",
      "profile_account_type": "User Account",
      "profile_settings": "Settings",
      "profile_nickname_label": "Nickname",
      "profile_save": "Save",
      "profile_danger_zone": "Danger Zone",
      "profile_withdraw_warning": "Account deletion is permanent and cannot be undone. All your data will be wiped from our servers.",
      "profile_withdraw_button": "WITHDRAW ACCOUNT",
      "nav_admin": "Admin",
      "admin_title": "Admin Settings",
      "admin_system_prompt": "System Prompt",
      "admin_user_management": "User Management",
      "save_prompt": "Save Prompt",
      "prompt_saved": "System prompt saved successfully!",
      "no_history": "No conversation history yet.",
      "coming_soon": "Service under construction. Coming soon!",
      "terms_content": "Terms of Service\n\n1. Use of Service: This AI chat app is provided for creative and informational purposes.\n2. User Responsibilities: Users are responsible for their interactions with the AI.\n3. Content Ownership: AI-generated content follows our standard usage guidelines.",
      "privacy_content": "Privacy Policy\n\n1. Data Collection: We collect minimum data for authentication (Kakao ID) and chat history.\n2. Data Usage: Your chat history is stored to provide better AI responses.\n3. Data Security: We prioritize the security of your information using Cloudflare infrastructure."
    }
  },
  ko: {
    translation: {
      "hero_title": "AI와 함께하는\n무엇이든 물어보세요",
      "hero_subtitle": "즉각적인 답변과 창의적인 통찰력을 제공하는 당신의 세련된 동반자입니다.",
      "login_kakao": "카카오로 로그인",
      "terms_prefix": "계속 진행하면 ",
      "terms": "이용약관",
      "and": " 및 ",
      "privacy": "개인정보처리방침",
      "welcome": "님 반갑습니다",
      "logout": "로그아웃",
      "ask_placeholder": "무엇이든 물어보세요...",
      "help_label": "무엇을 도와드릴까요?",
      "ask_button": "질문하기",
      "thinking": "생각 중...",
      "ai_response": "AI 답변",
      "footer_text": "Powered by Google Gemini 2.5 Flash",
      "ai_name": "AI",
      "you": "나",
      "just_now": "방금 전",
      "suggestion_poem": "시 써줘",
      "suggestion_coding": "코딩 도와줘",
      "suggestion_summarize": "글 요약해줘",
      "history_title": "기록",
      "search_placeholder": "대화 검색...",
      "today": "오늘",
      "yesterday": "어제",
      "nav_chat": "채팅",
      "nav_history": "기록",
      "nav_admin": "관리자",
      "admin_title": "관리자 설정",
      "admin_system_prompt": "시스템 프롬프트",
      "admin_user_management": "회원 관리",
      "save_prompt": "프롬프트 저장",
      "prompt_saved": "시스템 프롬프트가 성공적으로 저장되었습니다!",
      "no_history": "아직 대화 기록이 없습니다.",
      "coming_soon": "서비스 준비 중입니다. 곧 찾아뵙겠습니다!",
      "terms_content": "이용약관\n\n1. 서비스 이용: 본 AI 채팅 앱은 창의적이고 정보 제공 목적으로 제공됩니다.\n2. 사용자 책임: AI와의 상호작용은 사용자의 책임하에 이루어집니다.\n3. 콘텐츠 소유권: AI가 생성한 결과물은 당사의 표준 가이드라인을 따릅니다.",
      "privacy_content": "개인정보처리방침\n\n1. 데이터 수집: 인증(카카오 ID) 및 채팅 내역을 위한 최소한의 데이터를 수집합니다.\n2. 데이터 활용: 저장된 채팅 내역은 더 나은 AI 답변 제공을 위해 활용됩니다.\n3. 데이터 보안: Cloudflare 인프라를 사용하여 귀하의 정보를 안전하게 보호합니다."
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;