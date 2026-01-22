import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 图片提示词生成系统提示
const IMAGE_PROMPT_SYSTEM = `你是一位专业的AI绘图提示词工程师，专门为小红书内容创作精美配图。

## 核心任务
根据提供的小红书文案内容，生成高质量的AI绘图提示词(prompt)。

## 输出要求
1. **语言**: 使用英文编写提示词
2. **长度**: 80-150个单词
3. **格式**: 直接输出提示词，不要任何解释或前缀

## 提示词结构（按此顺序组织）
1. **主体描述**: 清晰描述画面主体（人物/物品/场景），包括动作、表情、姿态
2. **场景环境**: 描述背景、地点、时间（如室内/户外、城市/自然）
3. **风格定义**: 指定艺术风格（如摄影、插画、3D渲染）
4. **光线氛围**: 描述光线类型和氛围（如柔和自然光、金色夕阳、温馨氛围）
5. **色彩方案**: 指定主色调（如暖色调、莫兰迪色、清新色彩）
6. **细节增强**: 添加质量词（如8K, ultra detailed, professional photography）

## 小红书风格特点
- 精致感: 画面干净、构图讲究
- 生活化: 真实、有温度、可触及
- 时尚感: 符合当下审美趋势
- 情绪感: 传递积极正面的情绪

## 禁止事项
- 不要在图片中包含任何文字、标题、logo
- 不要生成过于复杂或混乱的场景
- 不要使用负面、阴暗的描述

## 场景建议词汇
- 美食: food photography, appetizing, steam rising, wooden table, natural daylight
- 穿搭: fashion photography, full body shot, street style, urban background
- 护肤美妆: beauty shot, soft focus, glowing skin, elegant packaging, marble surface
- 旅行: travel photography, scenic view, golden hour, wanderlust
- 家居: interior design, cozy atmosphere, Scandinavian style, natural materials
- 健身: fitness photography, dynamic pose, gym setting, motivational

请根据文案内容分析主题，生成最适合的配图提示词。`;

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
      max_tokens: 500,
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

    const { copy, profileId } = body;

    if (!copy?.trim()) {
      return NextResponse.json(
        { success: false, error: '文案内容不能为空' },
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

    // 截取文案（避免 token 过多）
    const truncatedCopy = copy.length > 1000 ? copy.substring(0, 1000) + '...' : copy;
    const userContent = `请为以下小红书文案生成配图提示词：

---
${truncatedCopy}
---

请根据文案的主题、情感和场景，生成一个能够完美配合内容的AI绘图提示词。`;

    // 调用 AI 生成提示词
    const prompt = await callTextModel(
      config.baseURL,
      config.apiKey,
      config.textModel,
      IMAGE_PROMPT_SYSTEM,
      userContent
    );

    // 清理提示词（移除可能的引号和多余空白）
    const cleanedPrompt = prompt
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    return NextResponse.json({
      success: true,
      data: {
        prompt: cleanedPrompt,
        model: config.textModel,
      },
    });

  } catch (error: any) {
    console.error('生成图片提示词失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成图片提示词失败，请稍后重试' },
      { status: 500 }
    );
  }
}
