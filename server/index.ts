import { createClient } from '@supabase/supabase-js';

export interface Env {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	OPENROUTER_API_KEY: string;
}

const getKST = () => {
	const now = new Date();
	const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
	return kstDate.toISOString().replace('Z', ''); 
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
			'Access-Control-Max-Age': '86400',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const jsonResponse = (data: unknown, status = 200) => {
			return new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		};

		// Supabase Client Initialization
		const authHeader = request.headers.get('Authorization');
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
			global: {
				headers: {
					Authorization: authHeader || '',
				},
			},
		});

		try {
			if (url.pathname === '/api/health') {
				return jsonResponse({ status: 'ok', time: getKST() });
			}

			// 3. AI 질문 (Streaming Support)
			if (url.pathname === '/api/ai/ask' && request.method === 'POST') {
				// Verify User
				const { data: { user }, error: authError } = await supabase.auth.getUser();
				if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

				const { prompt } = await request.json() as { prompt: string };

				// Fetch System Prompt
				const { data: config } = await supabase
					.from('system_config')
					.select('value')
					.eq('key', 'system_prompt')
					.single();
				
				const baseSystemPrompt = config?.value || '너는 유능한 AI 전문가야.';
                const systemPrompt = `${baseSystemPrompt} 반드시 한국어로만 답변해줘.`;
				const OPENROUTER_KEY = env.OPENROUTER_API_KEY;
				
				const models = [
					"google/gemini-2.0-flash-001",
					"google/gemini-2.5-flash",
					"google/gemini-2.5-pro",
                    "google/gemini-3-flash-preview"
				];

				let aiResponse: Response | undefined;
				let lastError = "";

				// Model Fallback Loop
				for (const model of models) {
					try {
						const controller = new AbortController();
						const timeout = setTimeout(() => controller.abort(), 20000); 
						
                        // Request Streaming from OpenRouter
                        aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
							method: 'POST',
							headers: { 
								'Authorization': `Bearer ${OPENROUTER_KEY}`,
								'Content-Type': 'application/json',
								'HTTP-Referer': 'https://proto-9ff.pages.dev',
								'X-Title': 'Proto AI'
							},
							body: JSON.stringify({
								"model": model,
                                "stream": true, // Enable Streaming
								"messages": [
									{"role": "system", "content": systemPrompt},
									{"role": "user", "content": prompt}
								]
							}),
                            signal: controller.signal
						});
						clearTimeout(timeout);
						
						if (aiResponse.ok) {
							break;
						}
						
                        try {
                            const errText = await aiResponse.text();
                            lastError = `Model ${model} failed: ${errText}`;
                        } catch {
                            lastError = `Model ${model} failed with status ${aiResponse.status}`;
                        }
						console.log(lastError);
                        aiResponse = undefined; 
					} catch (e: unknown) {
						lastError = e instanceof Error ? e.message : "Network error";
						continue;
					}
				}

				if (!aiResponse || !aiResponse.body) {
                    return jsonResponse({ error: lastError || "AI 응답 실패" }, 500);
                }

                // Tee the stream: one for client, one for DB
                const [clientStream, dbStream] = aiResponse.body.tee();

                // Process DB logging in background
                ctx.waitUntil((async () => {
                    try {
                        const reader = dbStream.getReader();
                        const decoder = new TextDecoder();
                        let fullAnswer = "";

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            
                            const chunk = decoder.decode(value, { stream: true });
                            const lines = chunk.split('\n');
                            for (const line of lines) {
                                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                                    try {
                                        const json = JSON.parse(line.slice(6));
                                        const content = json.choices?.[0]?.delta?.content || "";
                                        fullAnswer += content;
                                    } catch { /* ignore */ }
                                }
                            }
                        }

                        if (fullAnswer.trim()) {
                            await supabase.from('chat_history').insert({
                                user_id: user.id,
                                question: prompt,
                                answer: fullAnswer,
                            });
                        }
                    } catch (e) {
                        console.error("DB logging error:", e);
                    }
                })());

				return new Response(clientStream, {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    }
                });
			}

			return jsonResponse({ error: 'Not Found' }, 404);

		} catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Internal Server Error';
			return jsonResponse({ error: msg }, 500);
		}
	},
};
