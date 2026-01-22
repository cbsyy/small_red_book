import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 风格对应的系统提示 - 标准模式（基于大纲）
const VIBE_PROMPTS: Record<string, string> = {
  viral: `你是一位小红书爆款内容创作专家。请根据提供的大纲，生成一篇完整的小红书笔记。

要求：
1. 标题要有吸引力，使用数字、疑问句或情绪化词汇
2. 每个章节用 emoji + 小标题开头
3. 正文要有节奏感，善用分段
4. 适当使用 emoji 增加活力（但不要过度）
5. 加入个人体验和感受，增加真实感
6. 结尾要有互动引导，如"你们觉得呢？"、"评论区告诉我"
7. 最后添加 5-10 个相关话题标签（用 # 开头）

格式示例：
【吸引人的大标题】

✨ 第一部分标题
内容内容内容...

🌟 第二部分标题
内容内容内容...

---
#话题1 #话题2 #话题3`,

  minimal: `你是一位极简主义内容创作者。请根据提供的大纲，生成一篇简洁优雅的小红书笔记。

要求：
1. 标题简洁有力，不超过 15 字
2. 正文精炼，去除冗余词汇
3. 保持逻辑清晰，层次分明
4. 少用 emoji，保持克制
5. 使用简洁的排版
6. 添加 3-5 个精准的话题标签

格式示例：
标题

一、第一部分
简洁内容...

二、第二部分
简洁内容...

#话题1 #话题2 #话题3`,

  pro: `你是一位专业内容策划师。请根据提供的大纲，生成一篇专业深度的小红书笔记。

要求：
1. 标题体现专业性和价值
2. 正文有逻辑、有深度
3. 可以引用数据或案例（如果适用）
4. 结构清晰，论点明确
5. 语言专业但易懂
6. 添加 5-8 个行业相关话题标签

格式示例：
【专业标题】

▎核心观点
专业分析内容...

▎深度解读
详细论述...

▎实践建议
可操作的建议...

#行业话题1 #专业话题2`,
};

// 快速模式系统提示（直接基于原文）
const QUICK_MODE_PROMPTS: Record<string, string> = {
  viral: `你是一位小红书爆款内容创作专家。请根据提供的原文，直接改写成一篇适合小红书传播的笔记。

要求：
1. 提取原文核心观点和亮点
2. 标题要有吸引力，使用数字、疑问句或情绪化词汇
3. 使用 emoji + 小标题的形式组织内容
4. 正文要有节奏感，分成多个短段落
5. 语言口语化、接地气，增加个人感受
6. 结尾要有互动引导
7. 添加 5-10 个相关话题标签

格式示例：
【吸引人的大标题】

✨ 亮点一
改写内容...

🌟 亮点二
改写内容...

💡 总结
核心观点...

---
你们觉得呢？评论区聊聊~
#话题1 #话题2 #话题3`,

  minimal: `你是一位极简主义内容创作者。请根据提供的原文，改写成一篇简洁优雅的小红书笔记。

要求：
1. 提炼核心要点，去除冗余
2. 标题简洁有力，不超过 15 字
3. 保持逻辑清晰，层次分明
4. 少用 emoji，保持克制
5. 添加 3-5 个精准的话题标签

格式示例：
标题

一、核心观点
精炼内容...

二、关键要点
精炼内容...

#话题1 #话题2 #话题3`,

  pro: `你是一位专业内容策划师。请根据提供的原文，改写成一篇专业深度的小红书笔记。

要求：
1. 深度提炼专业内容
2. 标题体现专业性和价值
3. 正文有逻辑、有深度
4. 结构清晰，论点明确
5. 语言专业但易懂
6. 添加 5-8 个行业相关话题标签

格式示例：
【专业标题】

▎核心观点
专业分析内容...

▎深度解读
详细论述...

▎关键 Takeaway
可操作的要点...

#行业话题1 #专业话题2`,
};

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
      temperature: 0.8,
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

    const { outline, originalText, originalTitle, vibe = 'viral', profileId, mode = 'standard' } = body;

    // 验证输入（根据模式）
    if (mode === 'quick') {
      // 快速模式：需要原文
      if (!originalText?.trim()) {
        return NextResponse.json(
          { success: false, error: '原文内容不能为空' },
          { status: 400 }
        );
      }
    } else {
      // 标准模式：需要大纲
      if (!outline || !Array.isArray(outline) || outline.length === 0) {
        return NextResponse.json(
          { success: false, error: '大纲不能为空' },
          { status: 400 }
        );
      }
    }

    // 验证风格
    if (!['viral', 'minimal', 'pro'].includes(vibe)) {
      return NextResponse.json(
        { success: false, error: '无效的风格类型' },
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

    let systemPrompt: string;
    let userContent: string;

    if (mode === 'quick') {
      // 快速模式：基于原文直接生成
      systemPrompt = QUICK_MODE_PROMPTS[vibe];
      const truncatedText = originalText.length > 4000 ? originalText.substring(0, 4000) + '...' : originalText;
      userContent = `请根据以下原文，改写成小红书笔记：

标题：${originalTitle || '无标题'}

原文内容：
${truncatedText}`;
    } else {
      // 标准模式：基于大纲生成
      systemPrompt = VIBE_PROMPTS[vibe];
      const outlineText = outline
        .map((item: any, index: number) =>
          `【第 ${index + 1} 页 / 共 ${outline.length} 页】\n标题：${item.title}\n内容要点：${item.content}`
        )
        .join('\n\n');
      userContent = `请根据以下大纲生成完整的小红书笔记：\n\n${outlineText}`;
    }

    // 调用 AI 生成文案
    const copy = await callTextModel(
      config.baseURL,
      config.apiKey,
      config.textModel,
      systemPrompt,
      userContent
    );

    return NextResponse.json({
      success: true,
      data: {
        copy: copy.trim(),
        vibe,
        mode,
        model: config.textModel,
      },
    });

  } catch (error: any) {
    console.error('生成文案失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成文案失败，请稍后重试' },
      { status: 500 }
    );
  }
}
