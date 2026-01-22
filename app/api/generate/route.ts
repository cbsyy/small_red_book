import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 内容生成请求体
interface GenerateRequest {
  type: 'link' | 'upload' | 'text';
  content: string;
  vibe: 'viral' | 'minimal' | 'pro';
  profileId?: string;
}

// 风格对应的系统提示
const VIBE_PROMPTS: Record<string, string> = {
  viral: `你是一位小红书爆款内容创作专家。请将用户提供的内容改写成小红书风格的爆款笔记。
要求：
- 标题要有吸引力，使用数字、疑问句或情绪化词汇
- 正文要有节奏感，善用分段和表情符号
- 加入个人体验和感受，增加真实感
- 结尾要有互动引导，如"你们觉得呢？"
- 添加5-10个相关话题标签`,

  minimal: `你是一位极简主义内容创作者。请将用户提供的内容改写成简洁优雅的风格。
要求：
- 标题简洁有力，不超过15字
- 正文精炼，去除冗余
- 保持逻辑清晰，层次分明
- 使用简洁的排版，少用表情
- 添加3-5个精准的话题标签`,

  pro: `你是一位专业内容策划师。请将用户提供的内容改写成专业深度的风格。
要求：
- 标题体现专业性和价值
- 正文有数据支撑和案例分析
- 结构清晰，论点明确
- 语言专业但易懂
- 添加5-8个行业相关话题标签`,
};

// 调用 OpenAI 兼容 API
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
      max_tokens: 2000,
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
    const body: GenerateRequest = await req.json();
    const { type, content, vibe, profileId } = body;

    // 验证输入
    if (!content?.trim()) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    if (!['link', 'upload', 'text'].includes(type)) {
      return NextResponse.json({ error: '无效的输入类型' }, { status: 400 });
    }

    if (!['viral', 'minimal', 'pro'].includes(vibe)) {
      return NextResponse.json({ error: '无效的风格类型' }, { status: 400 });
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
          name: profile.name,
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
          name: defaultProfile.name,
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
          name: anyProfile.name,
        };
      }
    }

    if (!aiConfig) {
      return NextResponse.json({ error: '没有可用的 AI 模型，请先在 AI 配置管理中添加' }, { status: 503 });
    }

    // 构建用户内容
    let userContent = content;
    if (type === 'link') {
      userContent = `请将以下链接的内容改写成小红书笔记：\n${content}`;
    } else if (type === 'upload') {
      userContent = `请将以下文档内容改写成小红书笔记：\n${content}`;
    } else {
      userContent = `请将以下文本改写成小红书笔记：\n${content}`;
    }

    // 调用 AI
    const result = await callAI(
      aiConfig.baseURL,
      aiConfig.apiKey,
      aiConfig.model,
      VIBE_PROMPTS[vibe],
      userContent
    );

    return NextResponse.json({
      success: true,
      result,
      model: {
        name: aiConfig.name,
        model: aiConfig.model,
      },
    });

  } catch (error: any) {
    console.error('AI 生成失败:', error);
    return NextResponse.json(
      { error: error.message || '生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
