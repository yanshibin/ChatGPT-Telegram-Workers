import type { AgentUserConfig } from '#/config';
import type {
    AgentEnable,
    AgentModel,
    ChatAgent,
    ChatAgentRequest,
    ChatAgentResponse,
    ChatStreamTextHandler,
    LLMChatParams,
} from './types';
import { ImageSupportFormat, renderOpenAIMessages } from '#/agent/openai_compatibility';
import { requestChatCompletions } from './request';
import { bearerHeader, convertStringToResponseMessages, getAgentUserConfigFieldName, loadModelsList } from './utils';

export class Gemini implements ChatAgent {
    readonly name = 'gemini';
    readonly modelKey = getAgentUserConfigFieldName('GOOGLE_COMPLETIONS_MODEL');

    readonly enable: AgentEnable = ctx => !!(ctx.GOOGLE_API_KEY);
    readonly model: AgentModel = ctx => ctx.GOOGLE_COMPLETIONS_MODEL;

    readonly request: ChatAgentRequest = async (params: LLMChatParams, context: AgentUserConfig, onStream: ChatStreamTextHandler | null): Promise<ChatAgentResponse> => {
        const { prompt, messages } = params;
        const url = `${context.GOOGLE_API_BASE}/openai/chat/completions`;
        const header = bearerHeader(context.GOOGLE_API_KEY, onStream !== null);
        const body = {
            messages: await renderOpenAIMessages(prompt, messages, [ImageSupportFormat.BASE64]),
            model: context.GOOGLE_COMPLETIONS_MODEL,
            stream: onStream != null,
        };
        return convertStringToResponseMessages(requestChatCompletions(url, header, body, onStream, null));
    };

    readonly modelList = async (context: AgentUserConfig): Promise<string[]> => {
        if (context.GOOGLE_CHAT_MODELS_LIST === '') {
            context.GOOGLE_CHAT_MODELS_LIST = `${context.GOOGLE_API_BASE}/models`;
        }
        return loadModelsList(context.GOOGLE_CHAT_MODELS_LIST, async (url): Promise<string[]> => {
            const data = await fetch(`${url}?key=${context.GOOGLE_API_KEY}`).then(r => r.json());
            return data?.models
                ?.filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
                .map((model: any) => model.name.split('/').pop()) ?? [];
        });
    };
}
