import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "hero_title": "Ask Anything with AI",
      "hero_subtitle": "Your sophisticated companion for instant answers and creative insights.",
      "login_kakao": "Log in with Kakao",
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
      "history_title": "History",
      "search_placeholder": "Search conversations...",
      "today": "Today",
      "yesterday": "Yesterday",
      "nav_chat": "Chat",
      "nav_history": "History",
      "nav_explore": "Explore",
      "nav_profile": "Profile",
      "no_history": "No conversation history yet."
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
      "nav_explore": "탐색",
      "nav_profile": "프로필",
      "no_history": "아직 대화 기록이 없습니다."
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
