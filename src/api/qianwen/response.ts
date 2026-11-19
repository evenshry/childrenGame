import type { QianWenResponse } from './types';

/** 从千问响应中提取文本内容（兼容 output.text / choices[0].message.content） */
export const extractContent = (response: QianWenResponse): string => {
  const output = response.output;
  let content: string | undefined;

  if (typeof output === 'string') {
    content = output;
  } else if (typeof output?.text === 'string') {
    content = output.text;
  } else if (Array.isArray(output?.choices)) {
    content = output.choices[0]?.message?.content;
  }

  if (!content) {
    throw new Error('AI 未返回内容或响应格式异常');
  }

  content = content.trim();
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    content = fenced[1].trim();
  }
  return content;
};

/** 解析 AI 返回的 JSON 内容；失败时抛出可读错误 */
export const parseAIJson = (response: QianWenResponse): unknown => {
  const content = extractContent(response);
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('AI 返回的格式无效，无法解析为JSON');
  }
};

export const getResponseTokens = (response: QianWenResponse): number =>
  (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isNotNull = <T>(value: T | null): value is T => value !== null;