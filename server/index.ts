import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

export interface Env {
	DB: D1Database;
	KAKAO_CLIENT_ID: string;
	JWT_SECRET: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const adapter = new PrismaD1(env.DB);
		const prisma = new PrismaClient({ adapter });

		// CORS 헤더 설정
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		// OPTIONS 요청 처리 (CORS)
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// 기본 경로
		if (url.pathname === '/') {
			return new Response('Hello from Cloudflare Worker Backend!', { headers: corsHeaders });
		}

		// 카카오 로그인 콜백
		if (url.pathname === '/api/auth/kakao/callback') {
			const code = url.searchParams.get('code');
			if (!code) {
				return new Response(JSON.stringify({ error: 'Authorization code is missing' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			try {
				// 1. 카카오 토큰 요청
				const KAKAO_ID = env.KAKAO_CLIENT_ID;
				const REDIRECT_URI = 'https://proto-backend.yohan1067.workers.dev/api/auth/kakao/callback';

				const bodyParams = new URLSearchParams({
					grant_type: 'authorization_code',
					client_id: KAKAO_ID,
					redirect_uri: REDIRECT_URI,
					code: code,
				});

				// Client Secret이 환경변수에 설정되어 있다면 추가로 보냄
				if (env.KAKAO_CLIENT_SECRET) {
					bodyParams.append('client_secret', env.KAKAO_CLIENT_SECRET);
				}

				const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
					method: 'POST',
					headers: { 
						'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
					},
					body: bodyParams.toString(),
				});

				const tokenData: any = await tokenResponse.json();
				if (!tokenResponse.ok) {
					return new Response(JSON.stringify({ 
						msg: '카카오 토큰 교환 실패. 아래 내용을 확인하세요.',
						kakao_response: tokenData,
						sent_info: {
							client_id: KAKAO_ID.substring(0, 5) + '...',
							redirect_uri: REDIRECT_URI,
							code_received: code.substring(0, 5) + '...'
						}
					}), {
						status: 401,
						headers: { ...corsHeaders, 'Content-Type': 'application/json;charset=utf-8' },
					});
				}

				// 2. 카카오 사용자 정보 요청
				const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
					headers: {
						Authorization: `Bearer ${tokenData.access_token}`,
						'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
					},
				});

				const userData: any = await userResponse.json();
				
				if (!userResponse.ok) {
					return new Response(JSON.stringify({ 
						error: 'Failed to fetch user info', 
						kakao_response: userData 
					}), {
						status: userResponse.status,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				}

				const kakaoId = userData.id;
				const kakaoAccount = userData.kakao_account || {}; // 없으면 빈 객체로 처리

				                const nickname = kakaoAccount.profile?.nickname || 'KakaoUser_' + kakaoId.toString().substring(0, 4);
				                const email = kakaoAccount.email || null;
				
				                // 3. DB에 사용자 저장 또는 최신 정보로 업데이트 (Upsert)
				                const user = await prisma.user.upsert({
				                    where: { kakaoId: BigInt(kakaoId) },
				                    update: {
				                        nickname: nickname,
				                        email: email,
				                    },
				                    create: {
				                        kakaoId: BigInt(kakaoId),
				                        nickname: nickname,
				                        email: email,
				                    },
				                });
				
				                // 인증 성공 후 프론트엔드로 리다이렉트 (임시 토큰 포함)
				                const frontendUrl = 'https://5d85a48a.proto-frontend-at2.pages.dev';
				                const redirectUrl = `${frontendUrl}/?token=success_token_${user.id}`;
				                return Response.redirect(redirectUrl, 302);
			} catch (error: any) {
				return new Response(JSON.stringify({ error: error.message }), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
		}

		return new Response('Not Found', { status: 404, headers: corsHeaders });
	},
};
