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

let prisma: any; 

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
				
				                								const callGemini = async (modelName: string) => {
				
				                									console.log(`Calling Gemini API with model: ${modelName}`);
				
				                									// v1beta로 복구 (system_instruction 지원)
				
				                									return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
				
				                										method: 'POST',
				
				                										headers: { 'Content-Type': 'application/json' },
				
				                										body: JSON.stringify({
				
				                											contents: [
				
				                												{ role: 'user', parts: [{ text: `시스템 지침: ${systemPrompt}\n\n사용자 질문: ${prompt}` }] }
				
				                											],
				
				                											generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
				
				                										})
				
				                									});
				
				                								};
				
				                				
				
				                								const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash'];
				
				                				
				
				                
								let lastError = "";
								let aiResponse: any;
								let aiData: any;
				
								for (const model of modelsToTry) {
									aiResponse = await callGemini(model);
									aiData = await aiResponse.json();
									
									if (aiResponse.ok) break;
									
														lastError = aiData.error?.message || "Unknown error";
														console.error(`Model ${model} failed: ${lastError}`);
														
														// 리전 에러, 쿼터 에러, 또는 모델 과부하(overloaded)일 경우 재시도
														if (!lastError.includes("location") && !lastError.includes("quota") && !lastError.includes("overloaded")) break;
													}
																	if (!aiResponse.ok) {
									const colo = (request as any).cf?.colo || 'Unknown';
									let friendlyMessage = "AI 응답을 가져오지 못했습니다.";
									
									if (lastError.includes("location")) {
										friendlyMessage = `현재 접속 지역(${colo})은 구글 AI 서비스를 지원하지 않습니다. VPN을 사용 중이라면 해제하거나 한국 리전으로 접속해주세요.`;
									} else if (lastError.includes("quota")) {
										friendlyMessage = "일일 AI 사용 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.";
									}
				
									return jsonResponse({ 
										error: `Gemini API Error (${colo})`, 
										message: friendlyMessage,
										details: lastError
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

				const { results } = await env.DB.prepare("SELECT * FROM ChatHistory WHERE userId = ? ORDER BY createdAt DESC").bind(decoded.userId).all();
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
				const kakaoId = userData.id;
				const nickname = userData.kakao_account?.profile?.nickname || 'User';
				const email = userData.kakao_account?.email || null;

				// SQL 파라미터 개수 명시적 일치 (6개 ? -> 6개 bind)
				const now = new Date().toISOString();
				await env.DB.prepare(`
					INSERT INTO User (kakaoId, nickname, email, isAdmin, createdAt, updatedAt) 
					VALUES (?, ?, ?, ?, ?, ?)
					ON CONFLICT(kakaoId) DO UPDATE SET 
						nickname = excluded.nickname, 
						email = excluded.email,
						updatedAt = excluded.updatedAt
				`).bind(kakaoId, nickname, email, nickname === '최요한' ? 1 : 0, now, now).run();

				const user: any = await env.DB.prepare("SELECT id FROM User WHERE kakaoId = ?").bind(kakaoId).first();
				
				// 로그인 히스토리 기록
				const region = (request as any).cf?.region || (request as any).cf?.country || 'Unknown';
				await env.DB.prepare("INSERT INTO LoginHistory (userId, region) VALUES (?, ?)").bind(user.id, region).run();

				const { accessToken, refreshToken } = generateTokens(user.id);
				await env.DB.prepare("UPDATE User SET refreshToken = ? WHERE id = ?").bind(refreshToken, user.id).run();

				const redirectUrl = `https://proto-9ff.pages.dev/?access_token=${accessToken}&refresh_token=${refreshToken}&v=SQL_FINAL`;
				return Response.redirect(redirectUrl, 302);
			}

			return jsonResponse({ error: 'Not Found' }, 404);

		} catch (e: any) {
			console.error("Global Error:", e.message);
			return jsonResponse({ error: e.message || 'Internal Server Error' }, 500);
		}
	},
};