import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { QUICK_MODE_SYSTEM_PROMPT } from '@/lib/prompts';

// 获取图像 Prompt 配置作为系统提示词补充
async function getImagePromptSystemAddition(imagePromptId?: string): Promise<string> {
  try {
    if (imagePromptId) {
      const config = await prisma.promptConfig.findFirst({
        where: {
          id: imagePromptId,
          kind: 'image',
          enabled: true,
        },
      });
      if (config) {
        return config.content;
      }
    }

    const defaultConfig = await prisma.promptConfig.findFirst({
      where: {
        kind: 'image',
        isDefault: true,
        enabled: true,
      },
    });

    if (defaultConfig) {
      return defaultConfig.content;
    }
  } catch (error) {
    console.error('获取图像 Prompt 配置失败:', error);
  }

  return '';
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

// 获取默认 AI 配置
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

    const { content, title, count = 3, profileId, imagePromptId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      );
    }

    // 验证数量
    const validCounts = [1, 3, 6, 9] as const;
    const imageCount = validCounts.includes(count) ? count : 3;

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
    const truncatedContent = content.length > 3000 ? content.substring(0, 3000) + '...' : content;
    const userContent = `请根据以下文章内容，生成 ${imageCount} 张小红书知识分享类信息图的描述提示词。

文章标题：${title || '无标题'}

文章内容：
${truncatedContent}

请为这 ${imageCount} 张图片生成提示词，每张图片应该：
1. 聚焦文章中的一个核心知识点或概念
2. 用可视化方式（图表、流程图、对比图、概念图等）呈现内容
3. 包含具体的视觉元素描述（图标、箭头、气泡框、标注等）
4. 符合小红书清新、可爱、专业的风格
5. 使用英文编写图像描述（适配主流图像模型）

请以 JSON 格式返回，格式如下：
{
  "prompts": [
    {
      "angle": "图解类型（如：流程图解、概念对比、知识总结等）",
      "angleDescription": "这张图片要展示的核心内容",
      "prompt": "详细的英文图片描述提示词，包含布局、图形元素、配色等，80-120词",
      "contentBasis": "基于文章的哪部分内容"
    }
  ]
}`;

    // 获取用户配置的图像 Prompt 作为系统提示词补充
    const imagePromptAddition = await getImagePromptSystemAddition(imagePromptId);
    const finalSystemPrompt = imagePromptAddition
      ? `${QUICK_MODE_SYSTEM_PROMPT}\n\n## 用户自定义风格要求\n${imagePromptAddition}`
      : QUICK_MODE_SYSTEM_PROMPT;

    // 调用 AI
    const result = await callTextModel(
      config.baseURL,
      config.apiKey,
      config.textModel,
      finalSystemPrompt,
      userContent
    );

    // 解析 JSON 响应
    let prompts;
    try {
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

      // 清理 JSON 字符串中的控制字符（在字符串值内的换行等）
      jsonStr = jsonStr
        .replace(/[\x00-\x1F\x7F]/g, (char) => {
          // 保留换行和回车用于 JSON 结构，但在字符串值内需要转义
          if (char === '\n' || char === '\r' || char === '\t') {
            return char;
          }
          return '';
        })
        // 修复字符串值内未转义的换行符
        .replace(/"([^"]*?)"/g, (match, content) => {
          const escaped = content
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
          return `"${escaped}"`;
        });

      const parsed = JSON.parse(jsonStr);

      // 兼容多种返回格式
      if (Array.isArray(parsed)) {
        prompts = parsed;
      } else if (Array.isArray(parsed.prompts)) {
        prompts = parsed.prompts;
      } else if (Array.isArray(parsed.data)) {
        prompts = parsed.data;
      } else if (Array.isArray(parsed.items)) {
        prompts = parsed.items;
      } else if (Array.isArray(parsed.images)) {
        prompts = parsed.images;
      } else {
        // 最后尝试：查找第一个数组属性
        const arrayProp = Object.values(parsed).find(v => Array.isArray(v));
        if (arrayProp) {
          prompts = arrayProp;
        }
      }

      if (!Array.isArray(prompts) || prompts.length === 0) {
        console.error('无法从响应中提取提示词数组:', parsed);
        throw new Error('提示词格式错误');
      }
    } catch (parseError: any) {
      console.error('解析提示词失败:', parseError.message, '\n原始响应:', result.substring(0, 500));
      return NextResponse.json(
        { success: false, error: `生成的提示词格式错误: ${parseError.message}，请重试` },
        { status: 500 }
      );
    }

    // 规范化数据（不再追加风格，因为系统提示词已经指导 AI 生成完整的英文提示词）
    const normalizedPrompts = prompts.map((item: any, index: number) => {
      return {
        id: `quick-${Date.now()}-${index}`,
        angle: String(item.angle || `知识点${index + 1}`),
        angleDescription: String(item.angleDescription || ''),
        prompt: String(item.prompt || '').trim(),
        contentBasis: String(item.contentBasis || '').trim(),
        edited: false,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        prompts: normalizedPrompts,
        count: imageCount,
        model: config.textModel,
      },
    });

  } catch (error: any) {
    console.error('生成快速提示词失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成提示词失败，请稍后重试' },
      { status: 500 }
    );
  }
}
