import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface ChatRequest {
  message: string;
  profileId?: string;
}

async function callAI(
  baseURL: string,
  apiKey: string,
  model: string,
  message: string
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
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 1000,
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
    const body: ChatRequest = await req.json();
    const { message, profileId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
    }

    let config: { baseURL: string; apiKey: string; model: string; name: string } | null = null;

    // 优先使用指定的 profileId
    if (profileId) {
      const profile = await prisma.aIProfile.findFirst({
        where: { id: profileId, enabled: true },
      });
      if (profile && (profile.kind === 'text' || profile.kind === 'universal')) {
        config = {
          baseURL: profile.baseURL,
          apiKey: profile.apiKey,
          model: profile.model,
          name: profile.name,
        };
      }
    }

    // 回退到默认 AIProfile (text 或 universal)
    if (!config) {
      const defaultProfile = await prisma.aIProfile.findFirst({
        where: {
          enabled: true,
          isDefault: true,
          kind: { in: ['text', 'universal'] },
        },
      });
      if (defaultProfile) {
        config = {
          baseURL: defaultProfile.baseURL,
          apiKey: defaultProfile.apiKey,
          model: defaultProfile.model,
          name: defaultProfile.name,
        };
      }
    }

    // 再回退到任意启用的 AIProfile (text 或 universal)
    if (!config) {
      const anyProfile = await prisma.aIProfile.findFirst({
        where: {
          enabled: true,
          kind: { in: ['text', 'universal'] },
        },
      });
      if (anyProfile) {
        config = {
          baseURL: anyProfile.baseURL,
          apiKey: anyProfile.apiKey,
          model: anyProfile.model,
          name: anyProfile.name,
        };
      }
    }

    if (!config) {
      return NextResponse.json({ error: '没有可用的 AI 模型，请先在 AI 配置管理中添加' }, { status: 503 });
    }

    // 调用 AI
    const result = await callAI(config.baseURL, config.apiKey, config.model, message);

    return NextResponse.json({
      success: true,
      result,
      model: {
        name: config.name,
        model: config.model,
      },
    });

  } catch (error: any) {
    console.error('AI 调用失败:', error);
    return NextResponse.json(
      { error: error.message || '请求失败，请稍后重试' },
      { status: 500 }
    );
  }
}
