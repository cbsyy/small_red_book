import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 默认的图像提示词生成系统提示
const DEFAULT_IMAGE_PROMPT_SYSTEM = `你是专业的小红书知识图片设计师。根据提供的内容，生成适合 AI 图像模型的英文描述。

## 输出要求
- 语言：英文（适配 Flux/Stable Diffusion 等模型）
- 长度：80-120 词
- 风格：小红书知识信息图风格

## 风格特点
- Clean minimalist infographic style
- Soft pastel/macaron color palette (cream background, coral/teal accents)
- Rounded corners, cute icons
- Information visualization (flowcharts, comparison charts, mind maps)
- No text, no logos, no watermarks

## 内容转化指南
- 流程/步骤 → flowchart with numbered steps and arrows
- 对比/区别 → side-by-side comparison chart with VS divider
- 分类/层级 → tree diagram or nested circles
- 概念/定义 → central concept with radiating elements
- 数据/统计 → simple bar chart or pie chart icons

## 输出格式
直接输出英文图像描述，不要任何解释、引号或前缀。`;

// 获取风格标签的提示词片段
async function getStylePromptSnippets(styleIds: string[]): Promise<string[]> {
  if (!styleIds || styleIds.length === 0) {
    return [];
  }

  try {
    const styles = await prisma.imageStyle.findMany({
      where: {
        id: { in: styleIds },
        enabled: true,
      },
      select: {
        promptSnippet: true,
      },
    });

    return styles.map(s => s.promptSnippet).filter(Boolean);
  } catch (error) {
    console.error('获取风格标签失败:', error);
    return [];
  }
}

// 获取图像 Prompt 配置（用作系统提示词）
async function getImagePromptConfig(imagePromptId?: string): Promise<string> {
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

    // 获取默认的图像 Prompt 配置
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

    // 回退到任意启用的图像 Prompt
    const anyConfig = await prisma.promptConfig.findFirst({
      where: {
        kind: 'image',
        enabled: true,
      },
    });

    if (anyConfig) {
      return anyConfig.content;
    }
  } catch (error) {
    console.error('获取图像 Prompt 配置失败:', error);
  }

  return DEFAULT_IMAGE_PROMPT_SYSTEM;
}

// 调用文本模型生成图像提示词
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

  // 清理输出（移除可能的引号、换行等）
  return content
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

// 获取 AI 配置
async function getAIConfig(profileId?: string) {
  if (profileId) {
    const profile = await prisma.aIProfile.findFirst({
      where: { id: profileId, enabled: true, kind: { in: ['text', 'universal'] } },
    });
    if (profile) {
      return {
        baseURL: profile.baseURL,
        apiKey: profile.apiKey,
        model: profile.model,
      };
    }
  }

  // 回退到默认配置
  const defaultProfile = await prisma.aIProfile.findFirst({
    where: {
      enabled: true,
      isDefault: true,
      kind: { in: ['text', 'universal'] },
    },
  });

  if (defaultProfile) {
    return {
      baseURL: defaultProfile.baseURL,
      apiKey: defaultProfile.apiKey,
      model: defaultProfile.model,
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
      model: anyProfile.model,
    };
  }

  return null;
}

// 为单个内容项生成图像提示词
async function generateSingleImagePrompt(
  config: { baseURL: string; apiKey: string; model: string },
  systemPrompt: string,
  title: string,
  content: string,
  pageNumber: number,
  totalPages: number,
  styleSnippets: string[] = [],
  customStylePrompt: string = '',
  itemAdjustment: string = ''
): Promise<string> {
  // 构建风格说明
  let styleInstruction = '';
  if (styleSnippets.length > 0) {
    styleInstruction = `\n\n## 指定风格要求\n请在生成的图像描述中融入以下风格元素：\n${styleSnippets.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }

  // 用户自定义补充说明
  let customInstruction = '';
  if (customStylePrompt.trim()) {
    customInstruction = `\n\n## 用户补充要求\n${customStylePrompt}`;
  }

  // 单张图片的微调说明
  let adjustmentInstruction = '';
  if (itemAdjustment.trim()) {
    adjustmentInstruction = `\n\n## 针对本页的特别要求\n${itemAdjustment}`;
  }

  const userContent = `请为以下小红书笔记内容生成配图描述：

【第 ${pageNumber} 页 / 共 ${totalPages} 页】
标题：${title}
内容：${content}
${styleInstruction}${customInstruction}${adjustmentInstruction}

请生成一个专业的英文图像描述，用于 AI 图像生成模型。描述应该：
1. 体现这一页的核心知识点
2. 使用信息图可视化方式呈现
3. 融合指定的风格要求（如有）
4. 符合小红书清新可爱的风格`;

  return callTextModel(
    config.baseURL,
    config.apiKey,
    config.model,
    systemPrompt,
    userContent
  );
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

    const {
      outlineItems,
      imagePromptId,
      profileId,
      styleIds = [],           // 选中的风格 ID 列表
      customStylePrompt = '',  // 用户自定义补充说明
      itemAdjustments = {}     // 单张图片的微调 { [itemId]: string }
    } = body;

    if (!outlineItems || !Array.isArray(outlineItems) || outlineItems.length === 0) {
      return NextResponse.json(
        { success: false, error: '大纲内容不能为空' },
        { status: 400 }
      );
    }

    // 获取 AI 配置
    const config = await getAIConfig(profileId);
    if (!config) {
      return NextResponse.json(
        { success: false, error: '没有可用的 AI 模型配置' },
        { status: 503 }
      );
    }

    // 获取图像 Prompt 配置作为系统提示词
    const systemPrompt = await getImagePromptConfig(imagePromptId);

    // 获取风格标签的提示词片段
    const styleSnippets = await getStylePromptSnippets(styleIds);

    // 为每个大纲项生成图像提示词（串行执行避免并发限制）
    const results: Array<{ id: string; imagePrompt: string }> = [];
    const totalPages = outlineItems.length;

    for (let i = 0; i < outlineItems.length; i++) {
      const item = outlineItems[i];
      const itemAdjustment = itemAdjustments[item.id] || '';

      try {
        const imagePrompt = await generateSingleImagePrompt(
          config,
          systemPrompt,
          item.title || `第 ${i + 1} 页`,
          item.content || '',
          i + 1,
          totalPages,
          styleSnippets,
          customStylePrompt,
          itemAdjustment
        );
        results.push({
          id: item.id,
          imagePrompt,
        });
      } catch (error: any) {
        console.error(`生成第 ${i + 1} 页图像提示词失败:`, error);
        // 失败时使用备用提示词（包含风格片段）
        const fallbackStyle = styleSnippets.length > 0
          ? styleSnippets.join(', ')
          : 'Soft pastel colors';
        results.push({
          id: item.id,
          imagePrompt: `Clean minimalist infographic about "${item.title || 'knowledge point'}". ${fallbackStyle}, rounded corners, cute icons. Information visualization with flowchart elements. No text, no logos.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        prompts: results,
        model: config.model,
        stylesApplied: styleSnippets.length,
      },
    });

  } catch (error: any) {
    console.error('生成图像提示词失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成图像提示词失败' },
      { status: 500 }
    );
  }
}
