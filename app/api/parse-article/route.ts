import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface ParseArticleRequest {
  content: string;
  title?: string;
  pageCount?: number;
  profileId?: string;
}

const PARSE_PROMPT = `你是一位小红书内容创作专家。请将用户提供的文章内容转换为小红书多页卡片格式。

要求：
1. 生成一个吸引人的标题（不超过20字）
2. 生成一句简短的简介/hook（不超过50字）
3. 将内容拆分成 {pageCount} 页，每页包含：
   - 页码
   - 章节标题（简短有力，不超过10字）
   - 内容（100-150字，要有节奏感，可以用分点）
   - 背景图生成提示词（英文，描述适合该内容的抽象/意境背景图，不要包含文字）

请严格按照以下 JSON 格式输出（不要输出其他内容）：
{
  "title": "小红书标题",
  "introduction": "简介hook",
  "outline": [
    {
      "pageNumber": 1,
      "title": "章节标题",
      "content": "该页的正文内容...",
      "imagePrompt": "A beautiful abstract background with soft gradients..."
    }
  ]
}`;

async function callAI(
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
    const error = await response.text();
    throw new Error(`AI 调用失败: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(req: NextRequest) {
  try {
    const body: ParseArticleRequest = await req.json();
    const { content, title, pageCount = 5, profileId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    // 获取 AI 配置
    let aiConfig = null;

    // 优先使用指定的 profileId
    if (profileId) {
      const profile = await prisma.aIProfile.findFirst({
        where: { id: profileId, enabled: true },
      });
      if (profile && (profile.kind === 'text' || profile.kind === 'universal')) {
        aiConfig = {
          baseURL: profile.baseURL,
          apiKey: profile.apiKey,
          model: profile.model,
        };
      }
    }

    // 回退到默认 AIProfile (text 或 universal)
    if (!aiConfig) {
      const defaultProfile = await prisma.aIProfile.findFirst({
        where: {
          enabled: true,
          isDefault: true,
          kind: { in: ['text', 'universal'] },
        },
      });
      if (defaultProfile) {
        aiConfig = {
          baseURL: defaultProfile.baseURL,
          apiKey: defaultProfile.apiKey,
          model: defaultProfile.model,
        };
      }
    }

    // 再回退到任意启用的 AIProfile (text 或 universal)
    if (!aiConfig) {
      const anyProfile = await prisma.aIProfile.findFirst({
        where: {
          enabled: true,
          kind: { in: ['text', 'universal'] },
        },
      });
      if (anyProfile) {
        aiConfig = {
          baseURL: anyProfile.baseURL,
          apiKey: anyProfile.apiKey,
          model: anyProfile.model,
        };
      }
    }

    if (!aiConfig) {
      return NextResponse.json(
        { error: '没有可用的 AI 模型，请先在 AI 配置管理中添加' },
        { status: 503 }
      );
    }

    // 构建提示词
    const systemPrompt = PARSE_PROMPT.replace('{pageCount}', String(pageCount));
    const userContent = title
      ? `标题：${title}\n\n正文：${content}`
      : content;

    // 调用 AI
    const result = await callAI(
      aiConfig.baseURL,
      aiConfig.apiKey,
      aiConfig.model,
      systemPrompt,
      userContent
    );

    // 解析 JSON 结果
    let parsed;
    try {
      // 尝试提取 JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析 AI 返回的 JSON');
      }
    } catch (e) {
      console.error('JSON 解析失败:', result);
      return NextResponse.json(
        { error: 'AI 返回格式错误，请重试' },
        { status: 500 }
      );
    }

    // 验证结构
    if (!parsed.title || !parsed.outline || !Array.isArray(parsed.outline)) {
      return NextResponse.json(
        { error: 'AI 返回的数据结构不完整' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('解析失败:', error);
    return NextResponse.json(
      { error: error.message || '解析失败，请稍后重试' },
      { status: 500 }
    );
  }
}
