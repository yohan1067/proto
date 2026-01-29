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

let prisma: any; // Prisma 제거 후 직접 쿼리 사용 중

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

		const jsonResponse = (data: any, status = 200) => {
			return new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		};

		const generateTokens = (userId: number) => {
			const accessToken = jwt.sign({ userId }, jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
			const refreshToken = jwt.sign({ userId }, jwtSecret, { expiresIn: REFRESH_TOKEN_EXPIRY });
			return { accessToken, refreshToken };
		};

		try {
			if (url.pathname === '/api/health') {
				return jsonResponse({ status: 'ok', time: new Date().toISOString() });
			}

			// 1. 토큰 갱신
			if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
				const { refreshToken } = await request.json() as any;
				if (!refreshToken) return jsonResponse({ error: 'Missing refresh token' }, 400);

				const decoded = jwt.verify(refreshToken, jwtSecret) as any;
				const user = await env.DB.prepare("SELECT * FROM User WHERE id = ?").bind(decoded.userId).first();

				if (!user || user.refreshToken !== refreshToken) {
					return jsonResponse({ error: 'Invalid refresh token' }, 401);
				}

				const tokens = generateTokens(user.id as number);
				await env.DB.prepare("UPDATE User SET refreshToken = ? WHERE id = ?").bind(tokens.refreshToken, user.id).run();

				return jsonResponse(tokens);
			}

			// 2. 내 정보 가져오기
			if (url.pathname === '/api/user/me' && request.method === 'GET') {
				const authHeader = request.headers.get('Authorization');
				if (!authHeader || !authHeader.startsWith('Bearer ')) {
					return jsonResponse({ error: 'Unauthorized' }, 401);
				}
				const token = authHeader.split(' ')[1];
				const decoded = jwt.verify(token, jwtSecret) as any;

				const userPromise = env.DB.prepare("SELECT id, nickname, email, isAdmin FROM User WHERE id = ?").bind(decoded.userId).first();
				const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Database timeout")), 15000));
				const user = await Promise.race([userPromise, timeoutPromise]) as any;
				
				if (!user) return jsonResponse({ error: 'User not found' }, 404);
				return jsonResponse(user);
			}

			// 2-2. 회원 탈퇴
			if (url.pathname === '/api/user/withdraw' && request.method === 'DELETE') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;
				const userId = decoded.userId;

				await env.DB.prepare("DELETE FROM ChatHistory WHERE userId = ?").bind(userId).run();
				await env.DB.prepare("DELETE FROM LoginHistory WHERE userId = ?").bind(userId).run();
				await env.DB.prepare("DELETE FROM User WHERE id = ?").bind(userId).run();

				return jsonResponse({ success: true });
			}

			// 2-3. 회원 목록
			if (url.pathname === '/api/admin/users' && request.method === 'GET') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;
				
				const adminCheck: any = await env.DB.prepare("SELECT isAdmin FROM User WHERE id = ?").bind(decoded.userId).first();
				if (!adminCheck || !adminCheck.isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);

				const { results } = await env.DB.prepare("SELECT id, kakaoId, nickname, email, isAdmin, createdAt FROM User ORDER BY createdAt DESC").all();
				return jsonResponse(results);
			}

			// 2-1. 관리자 프롬프트
			if (url.pathname === '/api/admin/prompt') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;
				const user: any = await env.DB.prepare("SELECT isAdmin FROM User WHERE id = ?").bind(decoded.userId).first();
				
				if (!user || !user.isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);

				if (request.method === 'GET') {
					const config: any = await env.DB.prepare("SELECT value FROM SystemConfig WHERE key = 'system_prompt'").first();
					return jsonResponse({ prompt: config?.value || '너는 한국어로 코드 전문가야' });
				}

				if (request.method === 'POST') {
					const { prompt } = await request.json() as any;
					await env.DB.prepare("INSERT INTO SystemConfig (key, value) VALUES ('system_prompt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(prompt).run();
					return jsonResponse({ success: true });
				}
			}

			// 3. AI 질문
			if (url.pathname === '/api/ai/ask' && request.method === 'POST') {
				const authHeader = request.headers.get('Authorization');
				if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);
				const token = authHeader.split(' ')[1];
				const decoded = jwt.verify(token, jwtSecret) as any;
				const userId = decoded.userId;
				const { prompt } = await request.json() as any;

				const config: any = await env.DB.prepare("SELECT value FROM SystemConfig WHERE key = 'system_prompt'").first();
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
				                console.log("Gemini Raw Response:", JSON.stringify(aiData));
				
				                if (!aiResponse.ok) {
				                    const colo = (request as any).cf?.colo || 'Unknown';
				                    return jsonResponse({ 
				                        error: `Gemini API Error (Region: ${colo})`, 
				                        message: aiData.error?.message || "Location not supported or other API error"
				                    }, aiResponse.status);
				                }
				const answer = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
				if (answer) {
					await env.DB.prepare("INSERT INTO ChatHistory (userId, question, answer) VALUES (?, ?, ?)").bind(userId, prompt, answer).run();
					return jsonResponse({ answer });
				} else {
					return jsonResponse({ error: 'AI 답변 생성 실패' }, 500);
				}
			}

			// 4. 대화 기록
			if (url.pathname === '/api/history' && request.method === 'GET') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;

				const { results } = await env.DB.prepare("SELECT * FROM ChatHistory WHERE userId = ? ORDER BY createdAt DESC").all();
				return jsonResponse(results);
			}

			// 5. 카카오 로그인 콜백
			if (url.pathname === '/api/auth/kakao/callback') {
				const code = url.searchParams.get('code');
				if (!code) return new Response('Code missing', { status: 400, headers: corsHeaders });

				const REDIRECT_URI = 'https://proto-backend.yohan1067.workers.dev/api/auth/kakao/callback';

				// 토큰 요청 (주소 및 방식 수정)
				const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
					body: new URLSearchParams({
						grant_type: 'authorization_code',
						client_id: env.KAKAO_CLIENT_ID,
						client_secret: env.KAKAO_CLIENT_SECRET,
						redirect_uri: REDIRECT_URI,
						code,
					}).toString(),
				});

				const tokenData: any = await tokenResponse.json();
				if (!tokenResponse.ok) return jsonResponse(tokenData, 401);

				const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
					headers: { Authorization: `Bearer ${tokenData.access_token}` },
				});

				const userData: any = await userResponse.json();
				const kakaoId = userData.id;
				const nickname = userData.kakao_account?.profile?.nickname || 'User';
				const email = userData.kakao_account?.email || null;

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

				const redirectUrl = `https://proto-9ff.pages.dev/?access_token=${accessToken}&refresh_token=${refreshToken}&v=FINAL_FIX`;
				return Response.redirect(redirectUrl, 302);
			}

			return jsonResponse({ error: 'Not Found' }, 404);

		} catch (e: any) {
			console.error("Global Error:", e.message);
			return jsonResponse({ error: e.message || 'Internal Server Error' }, 500);
		}
	},
};
