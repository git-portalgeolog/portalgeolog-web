import OpenAI from "openai";

// Configuração para usar a API da NVIDIA
const nvidiaConfig = {
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "",
};

// Cliente OpenAI configurado para endpoint da NVIDIA
export const nvidia = new OpenAI({
  baseURL: nvidiaConfig.baseURL,
  apiKey: nvidiaConfig.apiKey,
});

// Modelos disponíveis na NVIDIA
export const MODELS = {
  // Kimi 2.6 (Moonshot AI) - Default
  KIMI_K2_0905: "moonshot/kimi-k2-0905",
  KIMI_K2: "moonshot/kimi-k2",

  // Meta (Llama)
  LLAMA_3_1_405B: "meta/llama-3.1-405b-instruct",
  LLAMA_3_1_70B: "meta/llama-3.1-70b-instruct",

  // Mistral
  MISTRAL_LARGE: "mistralai/mistral-large",
  MISTRAL_NEMO: "mistralai/mistral-nemo",

  // Google
  GEMMA_2_9B: "google/gemma-2-9b",
  GEMMA_2_27B: "google/gemma-2-27b",

  // Amazon
  NOVA_PRO: "amazon/nova-pro",
  NOVA_LITE: "amazon/nova-lite",

  // Qwen (Alibaba)
  QWEN_2_5_72B: "qwen/qwen-2.5-72b",
} as const;

/**
 * Modelo padrão (default: Kimi 2.6)
 */
export const DEFAULT_MODEL: Model = MODELS.KIMI_K2_0905;

export type Model = (typeof MODELS)[keyof typeof MODELS];

/**
 * Envia mensagem para a API da NVIDIA
 * @param model - Padrão: moonshot/kimi-k2-0905 (Kimi 2.6)
 */
export async function chat({
  model = DEFAULT_MODEL,
  messages,
  temperature = 0.7,
  maxTokens,
}: {
  model?: Model;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const response = await nvidia.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return response;
}

/**
 * Envia mensagem e retorna apenas o texto da resposta
 * @param model - Padrão: moonshot/kimi-k2-0905 (Kimi 2.6)
 */
export async function chatText({
  model = DEFAULT_MODEL,
  messages,
  temperature = 0.7,
  maxTokens,
}: {
  model?: Model;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const response = await chat({ model, messages, temperature, maxTokens });
  return response.choices[0]?.message.content || "";
}

export default nvidia;
