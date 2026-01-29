import jwt from 'jsonwebtoken';

export interface Env {
	DB: D1Database;
	KAKAO_CLIENT_ID: string;
	KAKAO_CLIENT_SECRET: string;
	OPENROUTER_API_KEY: string;
	JWT_SECRET: string;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// 한국 시간(KST) 생성 헬퍼 함수
const getKST = () => {
	const now = new Date();
	const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
	return kstDate.toISOString().replace('Z', ''); 
};

let prisma: any; 

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const jwtSecret = env.JWT_SECRET || 'fallback-secret-key-12345';

		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
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
				return jsonResponse({ status: 'ok', time: getKST() });
			}

			// 1. 토큰 갱신
			if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
				const { refreshToken } = await request.json() as any;
				if (!refreshToken) return jsonResponse({ error: 'Missing refresh token' }, 400);

				const decoded = jwt.verify(refreshToken, jwtSecret) as any;
				const user: any = await env.DB.prepare("SELECT * FROM User WHERE id = ?").bind(Number(decoded.userId)).first();

				if (!user || user.refreshToken !== refreshToken) {
					return jsonResponse({ error: 'Invalid refresh token' }, 401);
				}

				const tokens = generateTokens(Number(user.id));
				await env.DB.prepare("UPDATE User SET refreshToken = ? WHERE id = ?").bind(String(tokens.refreshToken), Number(user.id)).run();

				return jsonResponse(tokens);
			}

			// 2. 내 정보 가져오기
			if (url.pathname === '/api/user/me' && request.method === 'GET') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;

				const user: any = await env.DB.prepare("SELECT id, nickname, email, isAdmin, createdAt FROM User WHERE id = ?").bind(Number(decoded.userId)).first();
				
				if (!user) return jsonResponse({ error: 'User not found' }, 404);
				return jsonResponse(user);
			}

			// 2-2. 회원 탈퇴
			if (url.pathname === '/api/user/withdraw' && request.method === 'DELETE') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;
				const userId = Number(decoded.userId);

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
				
				const adminCheck: any = await env.DB.prepare("SELECT isAdmin FROM User WHERE id = ?").bind(Number(decoded.userId)).first();
				if (!adminCheck || !adminCheck.isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);

				const { results } = await env.DB.prepare("SELECT id, kakaoId, nickname, email, isAdmin, createdAt FROM User ORDER BY createdAt DESC").all();
				return jsonResponse(results);
			}

			// 2-4. 닉네임 수정
			if (url.pathname === '/api/user/update-nickname' && request.method === 'PATCH') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;
				const { nickname } = await request.json() as any;

				if (!nickname || nickname.trim().length < 2) {
					return jsonResponse({ error: 'Nickname too short' }, 400);
				}

				await env.DB.prepare("UPDATE User SET nickname = ?, updatedAt = ? WHERE id = ?").bind(nickname.trim(), getKST(), Number(decoded.userId)).run();
				return jsonResponse({ success: true });
			}

			// 2-1. 관리자 프롬프트
			if (url.pathname === '/api/admin/prompt') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;
				const adminCheck: any = await env.DB.prepare("SELECT isAdmin FROM User WHERE id = ?").bind(Number(decoded.userId)).first();
				if (!adminCheck || !adminCheck.isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);

				if (request.method === 'GET') {
					const config: any = await env.DB.prepare("SELECT value FROM SystemConfig WHERE key = ?").bind('system_prompt').first();
					return jsonResponse({ prompt: config?.value || '너는 한국어로 코드 전문가야' });
				}

				if (request.method === 'POST') {
					const { prompt } = await request.json() as any;
					await env.DB.prepare("INSERT INTO SystemConfig (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind('system_prompt', String(prompt)).run();
					return jsonResponse({ success: true });
				}
			}

			// 3. AI 질문
			if (url.pathname === '/api/ai/ask' && request.method === 'POST') {
				const authHeader = request.headers.get('Authorization');
				if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);
				const token = authHeader.split(' ')[1];
				const decoded = jwt.verify(token, jwtSecret) as any;
				const userId = Number(decoded.userId);
				const { prompt } = await request.json() as any;

				const config: any = await env.DB.prepare("SELECT value FROM SystemConfig WHERE key = ?").bind('system_prompt').first();
				const systemPrompt = config?.value || '너는 한국어로 대답하는 AI 전문가야';

				const OPENROUTER_KEY = env.OPENROUTER_API_KEY;
				
				const callOpenRouter = async (model: string) => {
					const url = `https://openrouter.ai/api/v1/chat/completions`;
					return await fetch(url, {
						method: 'POST',
						headers: { 
							'Authorization': `Bearer ${OPENROUTER_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							"model": model,
							"messages": [
								{"role": "system", "content": systemPrompt},
								{"role": "user", "content": prompt}
							]
						})
					});
				};

				const models = [
					"google/gemini-2.0-flash-exp:free",
					"meta-llama/llama-3.3-70b-instruct:free",
					"google/gemma-3-27b-it:free",
					"mistralai/mistral-small-2409:free",
					"qwen/qwen-2.5-72b-instruct:free"
				];

				let aiResponse: any;
				let aiData: any;
				let lastError = "";

				for (const model of models) {
					try {
						const controller = new AbortController();
						const timeout = setTimeout(() => controller.abort(), 15000);
						aiResponse = await callOpenRouter(model);
						clearTimeout(timeout);
						aiData = await aiResponse.json();
						if (aiResponse.ok) break;
						lastError = aiData.error?.message || "Model failed";
					} catch (e) {
						continue;
					}
				}

				if (!aiResponse || !aiResponse.ok) return jsonResponse({ error: lastError || "AI 응답 실패" }, 500);

				const answer = aiData.choices?.[0]?.message?.content;
				if (answer) {
					await env.DB.prepare("INSERT INTO ChatHistory (userId, question, answer, createdAt) VALUES (?, ?, ?, ?)").bind(userId, String(prompt), String(answer), getKST()).run();
					return jsonResponse({ answer });
				}
				return jsonResponse({ error: 'AI 답변 생성 실패' }, 500);
			}

			// 4. 대화 기록
			if (url.pathname === '/api/history' && request.method === 'GET') {
				const authHeader = request.headers.get('Authorization');
				const token = authHeader?.split(' ')[1];
				if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
				const decoded = jwt.verify(token, jwtSecret) as any;

				const { results } = await env.DB.prepare("SELECT id, userId, question, answer, createdAt FROM ChatHistory WHERE userId = ? ORDER BY createdAt DESC").bind(Number(decoded.userId)).all();
				return jsonResponse(results);
			}

			// 5. 카카오 로그인 콜백
			if (url.pathname === '/api/auth/kakao/callback') {
				const code = url.searchParams.get('code');
				if (!code) return new Response('Code missing', { status: 400, headers: corsHeaders });

				const REDIRECT_URI = 'https://proto-backend.yohan1067.workers.dev/api/auth/kakao/callback';

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
				const kakaoId = Number(userData.id);
				const nickname = userData.kakao_account?.profile?.nickname || 'User';
				const email = userData.kakao_account?.email || null;

				const now = getKST();
				await env.DB.prepare(`
					INSERT INTO User (kakaoId, nickname, email, isAdmin, createdAt, updatedAt) 
					VALUES (?, ?, ?, ?, ?, ?)
					ON CONFLICT(kakaoId) DO UPDATE SET 
						email = excluded.email,
						updatedAt = excluded.updatedAt
				`).bind(kakaoId, nickname, email, nickname === '최요한' ? 1 : 0, now, now).run();

				const dbUser: any = await env.DB.prepare("SELECT id FROM User WHERE kakaoId = ?").bind(kakaoId).first();
				const region = (request as any).cf?.region || (request as any).cf?.country || 'Unknown';
				await env.DB.prepare("INSERT INTO LoginHistory (userId, region, createdAt) VALUES (?, ?, ?)").bind(Number(dbUser.id), region, now).run();

				const { accessToken, refreshToken } = generateTokens(Number(dbUser.id));
				await env.DB.prepare("UPDATE User SET refreshToken = ? WHERE id = ?").bind(String(refreshToken), Number(dbUser.id)).run();

				const redirectUrl = `https://proto-9ff.pages.dev/?access_token=${accessToken}&refresh_token=${refreshToken}&v=KST_VER`;
				return Response.redirect(redirectUrl, 302);
			}

			return jsonResponse({ error: 'Not Found' }, 404);

		} catch (e: any) {
			return jsonResponse({ error: e.message || 'Internal Server Error' }, 500);
		}
	},
};
