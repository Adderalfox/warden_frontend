import { jsonInit, request } from "./http";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
export interface ToolUse {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
}
export interface PageContext {
  page?: string;
  path?: string;
  namespace?: string;
  service?: string;
  range?: string;
  pod?: string;
  incident_id?: string;
}

const B = "/api/backend/v1/assistant";
export const getAssistantStatus = () => request<{ configured: boolean; model: string }>(`${B}/status`);
export const sendChat = (messages: ChatTurn[], context: PageContext, signal?: AbortSignal) =>
  request<{ reply: string; tool_calls: ToolUse[] }>(`${B}/chat`, { ...jsonInit("POST", { messages, context }), signal });
