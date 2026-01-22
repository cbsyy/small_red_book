import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_TEXT_PROMPT } from '@/lib/prompts';

// 获取文本 Prompt 配置（支持指定 ID）
async function getTextPromptConfig(textPromptId?: string) {
  try {
    // 如果指定了 ID，优先使用
    if (textPromptId) {
      const config = await prisma.promptConfig.findFirst({
        where: {
          id: textPromptId,
          kind: 'text',
          enabled: true,
        },
      });
      if (config) {
        return config.content;
      }
    }

    // 获取默认的文本 Prompt 配置
    const config = await prisma.promptConfig.findFirst({
      where: {
        kind: 'text',
        isDefault: true,
        enabled: true,
      },
    });

    if (config) {
      return config.content;
    }

    // 回退到任意启用的文本 Prompt 配置
    const anyConfig = await prisma.promptConfig.findFirst({
      where: {
        kind: 'text',
        enabled: true,
      },
    });

    if (anyConfig) {
      return anyConfig.content;
    }
  } catch (error) {
    console.error('获取 Prompt 配置失败:', error);
  }

  // 回退到默认 Prompt
  return DEFAULT_TEXT_PROMPT;
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

// 获取默认 AI 配置（文本/通用类型）
async function getDefaultAIConfig() {
  // 使用默认的 AIProfile (text 或 universal)
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

  // 回退到任意启用的 AIProfile (text 或 universal)
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
    // 解析请求体
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

    // 获取 AI 配置：优先使用 profileId，否则使用默认配置
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
      ? `文章标题：${title}\n\n文章内容：\n${content}\n\n请严格按照 JSON 格式输出大纲，不要输出任何其他内容。`
      : `文章内容：\n${content}\n\n请严格按照 JSON 格式输出大纲，不要输出任何其他内容。`;

    // 获取文本 Prompt 配置（使用用户选择的或默认的）
    const baseSystemPrompt = await getTextPromptConfig(textPromptId);

    // 强制添加 JSON 输出提示（防止用户自定义 Prompt 没有要求 JSON）
    const systemPrompt = baseSystemPrompt.includes('JSON')
      ? baseSystemPrompt
      : `${baseSystemPrompt}\n\n【重要】你必须只输出 JSON 格式，格式为：{"outline":[{"pageNumber":1,"title":"标题","content":"内容"}]}，不要输出任何解释或其他文字。`;

    // 调用 AI 生成大纲
    const result = await callTextModel(
      config.baseURL,
      config.apiKey,
      config.textModel,
      systemPrompt,
      userContent
    );

    // 解析 JSON 响应
    let outline;
    try {
      // 尝试提取 JSON（处理可能的 markdown 代码块）
      let jsonStr = result.trim();

      // 1. 尝试从 markdown 代码块中提取
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        // 2. 尝试匹配 JSON 对象或数组
        const objectMatch = result.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (objectMatch) {
          jsonStr = objectMatch[1].trim();
        }
      }

      // 清理 JSON 字符串中的控制字符
      jsonStr = jsonStr
        .replace(/[\x00-\x1F\x7F]/g, (char) => {
          if (char === '\n' || char === '\r' || char === '\t') {
            return char;
          }
          return '';
        })
        .replace(/"([^"]*?)"/g, (match, content) => {
          const escaped = content
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
          return `"${escaped}"`;
        });

      const parsed = JSON.parse(jsonStr);

      // 兼容多种返回格式：
      // 1. { "outline": [...] } - 标准格式
      // 2. [...] - 直接数组
      // 3. { "pages": [...] } - 可能的变体
      // 4. { "data": [...] } - 可能的变体
      if (Array.isArray(parsed)) {
        outline = parsed;
      } else if (Array.isArray(parsed.outline)) {
        outline = parsed.outline;
      } else if (Array.isArray(parsed.pages)) {
        outline = parsed.pages;
      } else if (Array.isArray(parsed.data)) {
        outline = parsed.data;
      } else if (Array.isArray(parsed.items)) {
        outline = parsed.items;
      } else {
        // 最后尝试：如果是对象，查找第一个数组属性
        const arrayProp = Object.values(parsed).find(v => Array.isArray(v));
        if (arrayProp) {
          outline = arrayProp;
        }
      }

      if (!Array.isArray(outline) || outline.length === 0) {
        console.error('无法从响应中提取大纲数组:', parsed);
        throw new Error('大纲格式错误');
      }
    } catch (parseError: any) {
      console.error('解析大纲失败:', parseError.message, '\n原始响应:', result.substring(0, 500));
      return NextResponse.json(
        { success: false, error: `生成的大纲格式错误: ${parseError.message}，请重试` },
        { status: 500 }
      );
    }

    // 规范化大纲数据，添加 ID
    // 注意：imagePrompt 不在这里生成，由专门的 /generate-image-prompts API 负责
    const normalizedOutline = outline.map((item: any, index: number) => ({
      id: `outline-${Date.now()}-${index}`,
      pageNumber: index + 1,
      title: String(item.title || '').trim(),
      content: String(item.content || '').trim(),
      imagePrompt: '', // 留空，由 VisualStep 调用专门 API 生成
    }));

    return NextResponse.json({
      success: true,
      data: {
        outline: normalizedOutline,
        model: config.textModel,
        source: config.source,
      },
    });

  } catch (error: any) {
    console.error('生成大纲失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成大纲失败，请稍后重试' },
      { status: 500 }
    );
  }
}
