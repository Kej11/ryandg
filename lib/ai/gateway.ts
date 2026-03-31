import { gateway } from "ai";

export const DEFAULT_CHAT_MODEL = "google/gemini-3-flash";
export const DEFAULT_REASONING_MODEL = "anthropic/claude-sonnet-4.6";

export function getChatModelId() {
  return process.env.AI_GATEWAY_MODEL || DEFAULT_CHAT_MODEL;
}

export function createGatewayModel(model = getChatModelId()) {
  return gateway(model);
}

export function isAiGatewayConfigured() {
  return Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY);
}

export function assertAiGatewayConfigured() {
  if (isAiGatewayConfigured()) {
    return;
  }

  throw new Error(
    "AI Gateway is not configured. Run `vercel env pull .env.local` to populate VERCEL_OIDC_TOKEN or set AI_GATEWAY_API_KEY."
  );
}
