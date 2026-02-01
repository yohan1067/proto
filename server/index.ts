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
	async fetch(request: Request, env: Env): Promise<Response> {
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

		const jsonResponse = (data: any, status = 200) => {
			return new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		};

		// Supabase Client Initialization (Propagate User Auth)
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

			// 3. AI 질문 (Backend handles this to hide OpenRouter Key)
			if (url.pathname === '/api/ai/ask' && request.method === 'POST') {
				// Verify User via Supabase
				const { data: { user }, error: authError } = await supabase.auth.getUser();
				if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

				const { prompt } = await request.json() as any;

				// Fetch System Prompt from Supabase DB
				const { data: config } = await supabase
					.from('system_config')
					.select('value')
					.eq('key', 'system_prompt')
					.single();
				
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
					"google/gemini-2.0-flash-lite-preview-02-05:free",
					"meta-llama/llama-3.3-70b-instruct:free",
					"google/gemini-2.0-pro-exp-02-05:free",
					"deepseek/deepseek-r1:free",
					"qwen/qwen-2.5-vl-72b-instruct:free"
				];

				let aiResponse: any;
				let aiData: any;
				let lastError = "";

				for (const model of models) {
					try {
						const controller = new AbortController();
						const timeout = setTimeout(() => controller.abort(), 20000); // Increased timeout to 20s
						aiResponse = await callOpenRouter(model);
						clearTimeout(timeout);
						
						if (aiResponse.ok) {
							aiData = await aiResponse.json();
							// Check if choice exists (sometimes ok response but empty choices)
							if (aiData.choices && aiData.choices.length > 0) {
								break;
							}
						}
						
						// If response not ok or no choices, capture error and continue
						try {
							const errorData = await aiResponse.json();
							lastError = errorData.error?.message || `Model ${model} failed`;
						} catch (e) {
							lastError = `Model ${model} failed with status ${aiResponse.status}`;
						}
						console.log(`Fallback from ${model}: ${lastError}`);
					} catch (e: any) {
						lastError = e.message || "Network error";
						continue;
					}
				}

				if (!aiResponse || !aiResponse.ok) return jsonResponse({ error: lastError || "AI 응답 실패" }, 500);

				const answer = aiData.choices?.[0]?.message?.content;
				if (answer) {
					// Save to Supabase ChatHistory
					await supabase.from('chat_history').insert({
						user_id: user.id,
						question: String(prompt),
						answer: String(answer),
						// created_at is default now()
					});
					return jsonResponse({ answer });
				}
				return jsonResponse({ error: 'AI 답변 생성 실패' }, 500);
			}

			// Other endpoints are now handled directly by Supabase Client on Frontend.
			// Returning 404 for deprecated endpoints to prompt frontend update.
			return jsonResponse({ error: 'Endpoint moved to Supabase Client' }, 404);

		} catch (e: any) {
			return jsonResponse({ error: e.message || 'Internal Server Error' }, 500);
		}
	},
};
