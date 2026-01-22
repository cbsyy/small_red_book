import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_TEXT_PROMPT, getBasePromptForType } from '@/lib/prompts';

/**
 * 根据卡片内容自动生成 imagePrompt
 * 当 AI 返回的数据缺少 imagePrompt 时，自动补全
 */
function generateImagePromptFromContent(card: {
  pageType?: string;
  title?: string;
  subtitle?: string;
  content?: string;
  points?: Array<{ emoji?: string; label?: string; detail?: string }>;
}): string {
  const pageType = card.pageType || 'concept';
  const title = card.title || '';
  const subtitle = card.subtitle || '';

  // 获取基础模板
  let basePrompt = getBasePromptForType(pageType);

  // 替换标题占位符
  basePrompt = basePrompt.replace('[TITLE]', title);

  // 构建要点文字
  const pointsText = card.points?.length
    ? card.points.map(p => `(${p.emoji || '📌'} ${p.label || ''})`).join(', ')
    : '';

  // 组合完整 prompt
  let prompt = basePrompt;

  if (subtitle) {
    prompt += `, Chinese subtitle text (${subtitle})`;
  }

  if (pointsText) {
    prompt += `, Chinese bullet points ${pointsText}`;
  }

  // 添加通用后缀
  prompt += `, clean readable Chinese typography, modern sans-serif font, cream background, coral orange and teal accents, high quality 4K render, aspect ratio 3:4`;

  return prompt;
}

/**
 * 生成 imagePromptExplain
 */
function generateImagePromptExplain(card: {
  pageType?: string;
  title?: string;
  points?: Array<{ label?: string }>;
}): string {
  const pageType = card.pageType || 'concept';
  const title = card.title || '标题';

  const typeNames: Record<string, string> = {
    cover: '封面图',
    process: '流程图',
    comparison: '对比图',
    concept: '概念卡',
    checklist: '清单卡',
    timeline: '时间线',
    summary: '总结卡',
  };

  const typeName = typeNames[pageType] || '知识卡';
  const pointsCount = card.points?.length || 0;

  if (pointsCount > 0) {
    return `${typeName}：显示标题"${title}"和${pointsCount}个要点`;
  }
  return `${typeName}：显示标题"${title}"`;
}

/**
 * 获取文本 Prompt 配置（支持指定 ID）
 * 不再校验 prompt 内容，允许用户自由编写
 * @returns { prompt: string, configName?: string }
 */
async function getTextPromptConfig(textPromptId?: string): Promise<{
  prompt: string;
  configName?: string;
}> {
  try {
    let config = null;

    // 如果指定了 ID，优先使用
    if (textPromptId) {
      config = await prisma.promptConfig.findFirst({
        where: {
          id: textPromptId,
          kind: 'text',
          enabled: true,
        },
      });
    }

    // 没有指定 ID 或未找到，获取默认配置
    if (!config) {
      config = await prisma.promptConfig.findFirst({
        where: {
          kind: 'text',
          isDefault: true,
          enabled: true,
        },
      });
    }

    // 还是没有，获取任意启用的
    if (!config) {
      config = await prisma.promptConfig.findFirst({
        where: {
          kind: 'text',
          enabled: true,
        },
      });
    }

    if (config) {
      return {
        prompt: config.content,
        configName: config.name,
      };
    }
  } catch (error) {
    console.error('[Outline API] 获取 Prompt 配置失败:', error);
  }

  // 回退到内置的完整 prompt
  return {
    prompt: DEFAULT_TEXT_PROMPT,
    configName: '内置默认 Prompt',
  };
}

// 调用文本模型
async function callTextModel(
  baseURL: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const url = baseURL.endsWith('/') ? `${baseURL}chat/completions` : `${baseURL}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI 调用失败 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  return content;
}

/**
 * 解析 AI 返回的 JSON，带多级容错
 */
function parseAIResponse(result: string): any[] {
  let jsonStr = result.trim();

  // 从 markdown 代码块中提取
  const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    const objectMatch = result.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objectMatch) {
      jsonStr = objectMatch[1].trim();
    }
  }

  // 移除控制字符（保留换行、回车、制表符）
  jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 尝试直接解析
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // 修复：字符串值中的换行符
    jsonStr = jsonStr.replace(/:\s*"([^"]*)"/g, (match, content) => {
      const fixed = content
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `: "${fixed}"`;
    });

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // 更激进的修复 - 处理未转义的引号
      jsonStr = jsonStr.replace(
        /"imagePrompt"\s*:\s*"([\s\S]*?)(?=",\s*"imagePromptExplain"|",\s*"})/g,
        (match, content) => {
          const fixed = content
            .replace(/\\"/g, "'")
            .replace(/(?<!\\)"/g, "'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
          return `"imagePrompt": "${fixed}"`;
        }
      );
      parsed = JSON.parse(jsonStr);
    }
  }

  // 兼容多种返回格式
  if (Array.isArray(parsed)) {
    return parsed;
  } else if (Array.isArray(parsed.cards)) {
    return parsed.cards;
  } else if (Array.isArray(parsed.outline)) {
    return parsed.outline;
  } else if (Array.isArray(parsed.pages)) {
    return parsed.pages;
  } else {
    const arrayProp = Object.values(parsed).find(v => Array.isArray(v));
    if (arrayProp) {
      return arrayProp as any[];
    }
  }

  throw new Error('无法从响应中提取卡片数组');
}

// 获取默认 AI 配置（文本/通用类型）
async function getDefaultAIConfig() {
  const aiProfile = await prisma.aIProfile.findFirst({
    where: {
      enabled: true,
      isDefault: true,
      kind: { in: ['text', 'universal'] },
    },
  });

  if (aiProfile) {
    return {
      baseURL: aiProfile.baseURL,
      apiKey: aiProfile.apiKey,
      textModel: aiProfile.model,
      source: 'AIProfile',
    };
  }

  const anyProfile = await prisma.aIProfile.findFirst({
    where: {
      enabled: true,
      kind: { in: ['text', 'universal'] },
    },
  });

  if (anyProfile) {
    return {
      baseURL: anyProfile.baseURL,
      apiKey: anyProfile.apiKey,
      textModel: anyProfile.model,
      source: 'AIProfile',
    };
  }

  return null;
}

// 根据 profileId 获取 AI 配置
async function getAIConfigByProfileId(profileId: string) {
  const aiProfile = await prisma.aIProfile.findUnique({
    where: { id: profileId, enabled: true },
  });

  if (aiProfile && (aiProfile.kind === 'text' || aiProfile.kind === 'universal')) {
    return {
      baseURL: aiProfile.baseURL,
      apiKey: aiProfile.apiKey,
      textModel: aiProfile.model,
      source: 'AIProfile',
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '请求格式错误' },
        { status: 400 }
      );
    }

    const { content, title, profileId, textPromptId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      );
    }

    // 获取 AI 配置
    let config = null;
    if (profileId) {
      config = await getAIConfigByProfileId(profileId);
    }
    if (!config) {
      config = await getDefaultAIConfig();
    }

    if (!config) {
      return NextResponse.json(
        { success: false, error: '没有可用的 AI 模型配置，请先在设置中添加' },
        { status: 503 }
      );
    }

    // 构建用户内容
    const userContent = title
      ? `文章标题：${title}\n\n文章内容：\n${content}\n\n请严格按照系统提示的 JSON 格式输出，不要输出任何其他内容。`
      : `文章内容：\n${content}\n\n请严格按照系统提示的 JSON 格式输出，不要输出任何其他内容。`;

    // 获取 prompt 配置（允许用户自由编写，不做前置校验）
    const promptConfig = await getTextPromptConfig(textPromptId);
    const systemPrompt = promptConfig.prompt;
    console.log(`[Outline API] 使用 Prompt 配置: ${promptConfig.configName}`);

    // 调用 AI 生成大纲（带重试机制）
    const MAX_RETRIES = 2;
    let cards: any[] | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await callTextModel(
          config.baseURL,
          config.apiKey,
          config.textModel,
          systemPrompt,
          userContent
        );

        cards = parseAIResponse(result);

        if (cards && cards.length > 0) {
          break; // 成功解析，退出重试循环
        }
      } catch (error: any) {
        lastError = error;
        console.error(`[Outline API] 第 ${attempt} 次尝试失败:`, error.message);

        if (attempt < MAX_RETRIES) {
          console.log(`[Outline API] 将进行第 ${attempt + 1} 次重试...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒后重试
        }
      }
    }

    if (!cards || cards.length === 0) {
      console.error('[Outline API] 所有重试均失败');
      return NextResponse.json(
        {
          success: false,
          error: 'AI 输出格式解析失败，已重试多次。请稍后再试。',
          detail: lastError?.message || '未知错误',
          hint: '可能是 AI 输出了非标准 JSON 格式，或网络波动'
        },
        { status: 500 }
      );
    }

    // 规范化数据，确保结构完整（所有字段都有默认值）
    // 如果 AI 没有返回 imagePrompt，自动根据内容生成
    const normalizedCards = cards.map((item: any, index: number) => {
      const cardData = {
        pageNumber: item.pageNumber ?? index + 1,
        pageType: String(item.pageType || 'concept').trim(),
        title: String(item.title || '').trim(),
        subtitle: String(item.subtitle || '').trim(),
        content: String(item.content || '').trim(),
        points: Array.isArray(item.points) ? item.points.map((p: any) => ({
          emoji: String(p.emoji || '📌'),
          label: String(p.label || ''),
          detail: String(p.detail || ''),
        })) : [],
      };

      // 如果 AI 没有返回 imagePrompt，自动生成
      const hasImagePrompt = item.imagePrompt && String(item.imagePrompt).trim();
      const imagePrompt = hasImagePrompt
        ? String(item.imagePrompt).trim()
        : generateImagePromptFromContent(cardData);

      const hasImagePromptExplain = item.imagePromptExplain && String(item.imagePromptExplain).trim();
      const imagePromptExplain = hasImagePromptExplain
        ? String(item.imagePromptExplain).trim()
        : generateImagePromptExplain(cardData);

      return {
        id: `card-${Date.now()}-${index}`,
        ...cardData,
        imagePrompt,
        imagePromptExplain,
        // 标记是否是自动生成的
        imagePromptAutoGenerated: !hasImagePrompt,
        status: 'draft' as const,
      };
    });

    // 统计自动生成的数量
    const autoGeneratedCount = normalizedCards.filter((c: any) => c.imagePromptAutoGenerated).length;

    // 检查 AI 返回结果，如果有自动生成的 imagePrompt，提示用户
    const warnings: string[] = [];

    if (autoGeneratedCount > 0) {
      const msg = `已为 ${autoGeneratedCount} 张卡片自动生成 imagePrompt（AI 未返回该字段）`;
      console.log(`[Outline API] ${msg}`);
      warnings.push(msg);
    }

    return NextResponse.json({
      success: true,
      data: {
        cards: normalizedCards,
        model: config.textModel,
        source: config.source,
        promptConfig: promptConfig.configName,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (error: any) {
    console.error('[Outline API] 生成大纲失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成大纲失败，请稍后重试' },
      { status: 500 }
    );
  }
}
