import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enhanceUserPrompt } from '@/lib/prompts';

// 获取文本模型配置
async function getTextModelConfig() {
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
      model: aiProfile.model,
    };
  }

  // 回退到任意可用的文本模型
  const textProfile = await prisma.aIProfile.findFirst({
    where: {
      enabled: true,
      kind: { in: ['text', 'universal'] },
    },
  });

  if (textProfile) {
    return {
      baseURL: textProfile.baseURL,
      apiKey: textProfile.apiKey,
      model: textProfile.model,
    };
  }

  return null;
}

// 翻译提示词
const TRANSLATE_TO_ENGLISH_PROMPT = `你是专业的图像Prompt翻译专家。将用户的中文图像描述翻译成适合AI图像生成模型的英文Prompt。

## 翻译规则
1. 保持原意，但使用图像生成模型熟悉的英文术语
2. 保留关键视觉元素描述
3. 添加必要的风格修饰词
4. 输出纯英文，不要任何解释

## 风格词汇参考
- 信息图风格: infographic style, clean layout, minimal design
- 知识卡片: knowledge card, educational illustration
- 配色: soft pastel colors, cream background, coral and teal accents
- 元素: flat icons, rounded shapes, decorative borders

## 输出要求
直接输出英文Prompt，80-150词，末尾添加 "no text, no words, no letters, high quality 4K"`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, direction } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { success: false, error: '文本不能为空' },
        { status: 400 }
      );
    }

    // 获取模型配置
    const config = await getTextModelConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, error: '没有可用的AI模型配置' },
        { status: 503 }
      );
    }

    // 中文转英文（用于图像Prompt）
    if (direction === 'zh2en') {
      const url = config.baseURL.endsWith('/')
        ? `${config.baseURL}chat/completions`
        : `${config.baseURL}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: TRANSLATE_TO_ENGLISH_PROMPT },
            { role: 'user', content: `请将以下中文图像描述翻译成英文Prompt：\n\n${text}` },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI调用失败: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      let translated = data.choices?.[0]?.message?.content?.trim() || '';

      // 增强prompt，确保包含风格约束
      translated = enhanceUserPrompt(translated);

      return NextResponse.json({
        success: true,
        data: {
          original: text,
          translated,
        },
      });
    }

    // 英文转中文（解释Prompt含义）
    if (direction === 'en2zh') {
      const url = config.baseURL.endsWith('/')
        ? `${config.baseURL}chat/completions`
        : `${config.baseURL}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: '你是翻译专家。将英文图像Prompt翻译成简洁的中文描述，帮助用户理解这个Prompt会生成什么样的图片。输出简洁明了的中文，50-100字。',
            },
            { role: 'user', content: `请解释这个图像Prompt的含义：\n\n${text}` },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI调用失败: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      const translated = data.choices?.[0]?.message?.content?.trim() || '';

      return NextResponse.json({
        success: true,
        data: {
          original: text,
          translated,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: '不支持的翻译方向，请使用 zh2en 或 en2zh' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('翻译失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '翻译失败' },
      { status: 500 }
    );
  }
}
