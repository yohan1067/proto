import jwt from 'jsonwebtoken';

export interface Env {
	DB: D1Database;
	KAKAO_CLIENT_ID: string;
	KAKAO_CLIENT_SECRET: string;
	GEMINI_API_KEY: string;
	JWT_SECRET: string;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const jwtSecret = env.JWT_SECRET || 'fallback-secret-key-12345';

		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const generateTokens = (userId: number) => {
			const accessToken = jwt.sign({ userId }, jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
			const refreshToken = jwt.sign({ userId }, jwtSecret, { expiresIn: REFRESH_TOKEN_EXPIRY });
			return { accessToken, refreshToken };
		};

		// 1. 토큰 갱신
		if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
			try {
				const { refreshToken } = await request.json() as any;
				if (!refreshToken) return new Response('Missing refresh token', { status: 400, headers: corsHeaders });

				const decoded = jwt.verify(refreshToken, jwtSecret) as any;
				const user = await env.DB.prepare("SELECT * FROM User WHERE id = ?").bind(decoded.userId).first();

				if (!user || user.refreshToken !== refreshToken) {
					return new Response('Invalid refresh token', { status: 401, headers: corsHeaders });
				}

				const tokens = generateTokens(user.id as number);
				await env.DB.prepare("UPDATE User SET refreshToken = ? WHERE id = ?").bind(tokens.refreshToken, user.id).run();

				return new Response(JSON.stringify(tokens), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			} catch (e) {
				return new Response('Token refresh failed', { status: 401, headers: corsHeaders });
			}
		}

		// 2. 내 정보 가져오기
		if (url.pathname === '/api/user/me' && request.method === 'GET') {
			try {
				const authHeader = request.headers.get('Authorization');
				if (!authHeader || !authHeader.startsWith('Bearer ')) {
					return new Response('Unauthorized', { status: 401, headers: corsHeaders });
				}
				const token = authHeader.split(' ')[1];
				const decoded = jwt.verify(token, jwtSecret) as any;
				
				const user = await env.DB.prepare("SELECT id, nickname, email, isAdmin FROM User WHERE id = ?").bind(decoded.userId).first();
				
				if (!user) return new Response('User not found', { status: 404, headers: corsHeaders });
				return new Response(JSON.stringify(user), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			} catch (e) {
				return new Response('Invalid token', { status: 401, headers: corsHeaders });
			}
		}

		// 2-1. 관리자 프롬프트 관리
		if (url.pathname === '/api/admin/prompt') {
			try {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
				const decoded = jwt.verify(token, jwtSecret) as any;
				const user = await env.DB.prepare("SELECT isAdmin FROM User WHERE id = ?").bind(decoded.userId).first();
				
				if (!user || !user.isAdmin) {
					return new Response('Forbidden', { status: 403, headers: corsHeaders });
				}

				if (request.method === 'GET') {
					const config = await env.DB.prepare("SELECT value FROM SystemConfig WHERE key = 'system_prompt'").first();
					return new Response(JSON.stringify({ prompt: config?.value || '너는 한국어로 코드 전문가야' }), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				if (request.method === 'POST') {
					const { prompt } = await request.json() as any;
					await env.DB.prepare("INSERT INTO SystemConfig (key, value) VALUES ('system_prompt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(prompt).run();
					return new Response(JSON.stringify({ success: true }), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}
			} catch (e) {
				return new Response('Error', { status: 500, headers: corsHeaders });
			}
		}

		// 3. AI 질문
		if (url.pathname === '/api/ai/ask' && request.method === 'POST') {
			try {
				const authHeader = request.headers.get('Authorization');
				if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
				const token = authHeader.split(' ')[1];
				const decoded = jwt.verify(token, jwtSecret) as any;
				const userId = decoded.userId;
				const { prompt } = await request.json() as any;

				const config = await env.DB.prepare("SELECT value FROM SystemConfig WHERE key = 'system_prompt'").first();
				const systemPrompt = config?.value || '너는 한국어로 코드 전문가야';

				const GEMINI_API_KEY = (env.GEMINI_API_KEY || '').trim();
				const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						system_instruction: { parts: [{ text: systemPrompt }] },
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
					})
				});

				const aiData: any = await aiResponse.json();
				const answer = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

				if (answer) {
					await env.DB.prepare("INSERT INTO ChatHistory (userId, question, answer) VALUES (?, ?, ?)").bind(userId, prompt, answer).run();
				}

				return new Response(JSON.stringify({ answer }), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			} catch (e: any) {
				return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
			}
		}

		// 4. 대화 기록 조회
		if (url.pathname === '/api/history' && request.method === 'GET') {
			try {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
				const decoded = jwt.verify(token, jwtSecret) as any;

				const { results } = await env.DB.prepare("SELECT * FROM ChatHistory WHERE userId = ? ORDER BY createdAt DESC").bind(decoded.userId).all();
				return new Response(JSON.stringify(results), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			} catch (e) {
				return new Response('Error', { status: 500, headers: corsHeaders });
			}
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
				const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
					headers: { Authorization: `Bearer ${tokenData.access_token}` },
				});

				const userData: any = await userResponse.json();
				const kakaoId = userData.id;
				const nickname = userData.kakao_account?.profile?.nickname || 'User';
				const email = userData.kakao_account?.email || null;

				// 직접 SQL로 Upsert 구현
				await env.DB.prepare(`
					INSERT INTO User (kakaoId, nickname, email, isAdmin, updatedAt) 
					VALUES (?, ?, ?, ?, DATETIME('now'))
					ON CONFLICT(kakaoId) DO UPDATE SET 
						nickname = excluded.nickname, 
						email = excluded.email,
						updatedAt = DATETIME('now')
				`).bind(kakaoId, nickname, email, nickname === '최요한' ? 1 : 0).run();

				const user: any = await env.DB.prepare("SELECT id FROM User WHERE kakaoId = ?").bind(kakaoId).first();
				const { accessToken, refreshToken } = generateTokens(user.id);
				await env.DB.prepare("UPDATE User SET refreshToken = ? WHERE id = ?").bind(refreshToken, user.id).run();

				const redirectUrl = `https://proto-9ff.pages.dev/?access_token=${accessToken}&refresh_token=${refreshToken}&v=SQL_VER`;
				return Response.redirect(redirectUrl, 302);
			} catch (error: any) {
				return new Response(error.message, { status: 500, headers: corsHeaders });
			}
		}

		return new Response('Not Found', { status: 404, headers: corsHeaders });
	},
};