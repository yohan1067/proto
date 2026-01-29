import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import jwt from 'jsonwebtoken';

export interface Env {
	DB: D1Database;
	KAKAO_CLIENT_ID: string;
	KAKAO_CLIENT_SECRET: string;
	JWT_SECRET: string;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const adapter = new PrismaD1(env.DB);
		const prisma = new PrismaClient({ adapter });
		const jwtSecret = env.JWT_SECRET || 'fallback-secret-key-12345';

		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// 토큰 발급 헬퍼 함수
		const generateTokens = (userId: number) => {
			const accessToken = jwt.sign({ userId }, jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
			const refreshToken = jwt.sign({ userId }, jwtSecret, { expiresIn: REFRESH_TOKEN_EXPIRY });
			return { accessToken, refreshToken };
		};

		// 1. 토큰 갱신 엔드포인트
		if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
			try {
				const { refreshToken } = await request.json() as any;
				if (!refreshToken) return new Response('Missing refresh token', { status: 400, headers: corsHeaders });

				const decoded = jwt.verify(refreshToken, jwtSecret) as any;
				const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

				if (!user || user.refreshToken !== refreshToken) {
					return new Response('Invalid refresh token', { status: 401, headers: corsHeaders });
				}

				const tokens = generateTokens(user.id);
				await prisma.user.update({
					where: { id: user.id },
					data: { refreshToken: tokens.refreshToken }
				});

				return new Response(JSON.stringify(tokens), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			} catch (e) {
				return new Response('Token refresh failed', { status: 401, headers: corsHeaders });
			}
		}

		// 2. 내 정보 가져오기 엔드포인트
		if (url.pathname === '/api/user/me' && request.method === 'GET') {
			// ... 기존 코드 유지 (생략하지 않고 전체 로직 포함)
			try {
				const authHeader = request.headers.get('Authorization');
				if (!authHeader || !authHeader.startsWith('Bearer ')) {
					return new Response('Unauthorized', { status: 401, headers: corsHeaders });
				}
				const token = authHeader.split(' ')[1];
				const decoded = jwt.verify(token, jwtSecret) as any;
				const user = await prisma.user.findUnique({
					where: { id: decoded.userId },
					select: { id: true, nickname: true, email: true }
				});
				if (!user) return new Response('User not found', { status: 404, headers: corsHeaders });
				return new Response(JSON.stringify(user), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			} catch (e) {
				return new Response('Invalid token', { status: 401, headers: corsHeaders });
			}
		}

		// 3. 제미나이 AI 질문 엔드포인트
		if (url.pathname === '/api/ai/ask' && request.method === 'POST') {
			try {
				const authHeader = request.headers.get('Authorization');
				if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

				                const token = authHeader.split(' ')[1];
				                const decoded = jwt.verify(token, jwtSecret) as any;
				                const userId = decoded.userId;
				
				                const { prompt } = await request.json() as any;
				                const GEMINI_API_KEY = (env.GEMINI_API_KEY || '').trim();
				
				                // 서버 측 타임아웃 설정 (25초)
				                const aiController = new AbortController();
				                const aiTimeout = setTimeout(() => aiController.abort(), 25000);

				                // Google Gemini API 호출 (최신 2.5-flash 모델 사용)
				                const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
				                    method: 'POST',
				                    headers: { 'Content-Type': 'application/json' },
				                    body: JSON.stringify({
				                        system_instruction: {
				                            parts: [{ text: '너는 한국어로 코드 전문가야' }]
				                        },
				                        contents: [{ parts: [{ text: prompt }] }],
				                        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
				                    }),
				                    signal: aiController.signal
				                });
				
				                clearTimeout(aiTimeout);
				                const aiData: any = await aiResponse.json();
				                
				                if (!aiResponse.ok) {
				                    console.error('Gemini API Error:', aiData);
				                    return new Response(JSON.stringify({
				                        error: 'Gemini API Error',
				                        message: aiData.error?.message,
				                        details: aiData
				                    }), {
				                        status: aiResponse.status,
				                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				                    });
				                }
				
				                const answer = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
				
				                // 3-1. 채팅 히스토리 저장
				                if (answer) {
				                    await prisma.chatHistory.create({
				                        data: {
				                            userId: userId,
				                            question: prompt,
				                            answer: answer
				                        }
				                    });
				                }
				
				                return new Response(JSON.stringify({ answer }), {
				                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				                });			} catch (e: any) {
				return new Response(JSON.stringify({ error: e.message }), { status: 401, headers: corsHeaders });
			}
		}

		// 4. 사용 가능한 모델 목록 확인 (디버깅용)
		if (url.pathname === '/api/ai/models' && request.method === 'GET') {
			const GEMINI_API_KEY = (env.GEMINI_API_KEY || '').trim();
			const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
			const data = await res.json();
			return new Response(JSON.stringify(data), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// 5. 카카오 로그인 콜백
		if (url.pathname === '/api/auth/kakao/callback') {
			const code = url.searchParams.get('code');
			if (!code) return new Response('Code missing', { status: 400, headers: corsHeaders });

			try {
				const KAKAO_ID = env.KAKAO_CLIENT_ID;
				const REDIRECT_URI = 'https://proto-backend.yohan1067.workers.dev/api/auth/kakao/callback';

				const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
					body: new URLSearchParams({
						grant_type: 'authorization_code',
						client_id: KAKAO_ID,
						client_secret: env.KAKAO_CLIENT_SECRET,
						redirect_uri: REDIRECT_URI,
						code,
					}).toString(),
				});

				const tokenData: any = await tokenResponse.json();
				if (!tokenResponse.ok) return new Response(JSON.stringify(tokenData), { status: 401, headers: corsHeaders });

				const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
					headers: { Authorization: `Bearer ${tokenData.access_token}` },
				});

				const userData: any = await userResponse.json();
				const kakaoId = userData.id;
				const kakaoAccount = userData.kakao_account || {};
				const nickname = kakaoAccount.profile?.nickname || 'KakaoUser_' + kakaoId.toString().substring(0, 4);

				const user = await prisma.user.upsert({
					where: { kakaoId: BigInt(kakaoId) },
					update: { nickname, email: kakaoAccount.email || null },
					create: { kakaoId: BigInt(kakaoId), nickname, email: kakaoAccount.email || null },
				});

				// 토큰 생성 및 저장
				const { accessToken, refreshToken } = generateTokens(user.id);
				await prisma.user.update({
					where: { id: user.id },
					data: { refreshToken }
				});

				                // 인증 성공 후 프론트엔드로 리다이렉트 (임시 토큰 포함, 캐시 방지 파라미터 추가)
				                const frontendUrl = 'https://proto-9ff.pages.dev';
				                const redirectUrl = `${frontendUrl}/?access_token=${accessToken}&refresh_token=${refreshToken}&v=FINAL`;
				                return Response.redirect(redirectUrl, 302);
			} catch (error: any) {
				return new Response(error.message, { status: 500, headers: corsHeaders });
			}
		}

		return new Response('Not Found', { status: 404, headers: corsHeaders });
	},
};
