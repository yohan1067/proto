import { createClient } from '@supabase/supabase-js';

export interface Env {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	OPENROUTER_API_KEY: string;
    BUCKET: R2Bucket;
    R2_PUBLIC_URL: string;
}

const getKST = () => {
	const now = new Date();
	const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
	return kstDate.toISOString().replace('Z', ''); 
};

const ALLOWED_ORIGINS = [
    'https://proto-9ff.pages.dev',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '';
        const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
		
		const corsHeaders = {
			'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
			'Access-Control-Max-Age': '86400',
            'Vary': 'Origin', 
		};

        const securityHeaders = {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
        };

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const jsonResponse = (data: unknown, status = 200) => {
			return new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
			});
		};

		const authHeader = request.headers.get('Authorization');
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
			global: { headers: { Authorization: authHeader || '' } },
		});

        const checkAuth = async () => {
             if (!isAllowedOrigin && origin) return { error: 'Forbidden Origin', status: 403 };
             const { data: { user }, error: authError } = await supabase.auth.getUser();
             if (authError || !user) return { error: 'Unauthorized', status: 401 };
             return { user };
        };

		try {
			if (url.pathname === '/api/health') {
				return jsonResponse({ status: 'ok', time: getKST(), version: '1.2.1' });
			}

            if (url.pathname === '/api/upload' && request.method === 'POST') {
                try {
                    const auth = await checkAuth();
                    if ('error' in auth) return jsonResponse({ error: auth.error }, auth.status);

                    // Check if BUCKET binding exists
                    if (!env.BUCKET) {
                        throw new Error("R2 Bucket binding not found. Check wrangler.toml and dashboard.");
                    }

                    const formData = await request.formData();
                    const file = formData.get('file') as File;
                    
                    if (!file) return jsonResponse({ error: 'No file provided' }, 400);
                    if (!file.type.startsWith('image/')) return jsonResponse({ error: 'Invalid file type' }, 400);
                                    if (file.size > 10 * 1024 * 1024) return jsonResponse({ error: 'File too large (max 10MB)' }, 400);
                    
                                    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                                    const fileName = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
                                    await env.BUCKET.put(fileName, file);                    
                    const publicUrl = `${env.R2_PUBLIC_URL}/${fileName}`;
                    return jsonResponse({ url: publicUrl });
                } catch (e: any) {
                    return jsonResponse({ error: `Upload Failed: ${e.message}` }, 500);
                }
            }

			if (url.pathname === '/api/ai/ask' && request.method === 'POST') {
                const auth = await checkAuth();
                if ('error' in auth) return jsonResponse({ error: auth.error }, auth.status);

				const body = await request.json() as { prompt?: string, imageUrl?: string };
                const prompt = body.prompt || '';
                const imageUrl = body.imageUrl;

                if (!prompt.trim() && !imageUrl) {
                    return jsonResponse({ error: 'Prompt or Image is required' }, 400);
                }

				const { data: config } = await supabase.from('system_config').select('value').eq('key', 'system_prompt').single();
				const baseSystemPrompt = config?.value || '너는 유능한 AI 전문가야.';
                const systemPrompt = `${baseSystemPrompt} 반드시 한국어로만 답변해줘.`;
				
                const userContent: any[] = [{ "type": "text", "text": prompt }];
                if (imageUrl) {
                    userContent.push({ "type": "image_url", "image_url": { "url": imageUrl } });
                }

				const models = ["google/gemini-2.0-flash-001", "google/gemini-flash-1.5", "google/gemini-pro-1.5"];
				let aiResponse: Response | undefined;
				let lastError = "";

				for (const model of models) {
					try {
						const controller = new AbortController();
						const timeout = setTimeout(() => controller.abort(), 30000); 
						
                        aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
							method: 'POST',
							headers: { 
								'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
								'Content-Type': 'application/json',
								'HTTP-Referer': 'https://proto-9ff.pages.dev',
								'X-Title': 'Proto AI'
							},
							body: JSON.stringify({
								"model": model,
                                "stream": true, 
								"messages": [
									{"role": "system", "content": systemPrompt},
									{"role": "user", "content": userContent}
								]
							}),
                            signal: controller.signal
						});
						clearTimeout(timeout);
						if (aiResponse.ok) break;
                        const errText = await aiResponse.text();
                        lastError = `Model ${model} failed: ${errText}`;
                        aiResponse = undefined; 
					} catch (e: any) {
						lastError = `Network error: ${e.message}`;
						continue;
					}
				}

				if (!aiResponse || !aiResponse.body) return jsonResponse({ error: lastError || "AI 응답 실패" }, 500);

                const [clientStream, dbStream] = aiResponse.body.tee();

                ctx.waitUntil((async () => {
                    try {
                        const reader = dbStream.getReader();
                        const decoder = new TextDecoder();
                        let fullAnswer = "";
                        let buffer = ""; 

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || "";
                            for (const line of lines) {
                                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                                    try {
                                        const json = JSON.parse(line.slice(6));
                                        fullAnswer += json.choices?.[0]?.delta?.content || "";
                                    } catch {}
                                }
                            }
                        }
                        if (fullAnswer.trim()) {
                            await supabase.from('chat_history').insert({
                                user_id: auth.user.id,
                                question: imageUrl ? `[Image] ${prompt}` : prompt,
                                answer: fullAnswer,
                            });
                        }
                    } catch {}
                })());

				return new Response(clientStream, {
                    headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
                });
			}
			return jsonResponse({ error: 'Not Found' }, 404);
		} catch (e: any) {
			return jsonResponse({ error: `Internal Server Error: ${e.message}` }, 500);
		}
	},
};
