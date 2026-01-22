import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_IMAGE_PROMPT } from '@/lib/prompts';

interface GenerateImageRequest {
  prompt: string;
  width?: number;
  height?: number;
  negativePrompt?: string;
  profileId?: string;
  imagePromptId?: string;  // 图像风格 Prompt ID
  enhanceWithStyle?: boolean;  // 是否使用图像风格增强
}

// 获取图像 Prompt 配置（支持指定 ID）
async function getImagePromptConfig(imagePromptId?: string): Promise<string | null> {
  try {
    // 如果指定了 ID，优先使用
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
    const config = await prisma.promptConfig.findFirst({
      where: {
        kind: 'image',
        isDefault: true,
        enabled: true,
      },
    });

    if (config) {
      return config.content;
    }

    // 回退到任意启用的图像 Prompt 配置
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

  // 回退到默认 Prompt
  return DEFAULT_IMAGE_PROMPT;
}

// 增强 prompt 使用图像风格
function enhancePromptWithImageStyle(prompt: string, stylePrompt: string): string {
  return `${prompt}

${stylePrompt}`;
}

// 调用阿里云 DashScope 图像 API
async function callDashScopeImageAPI(
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  // DashScope 图像生成端点
  const url = baseURL.endsWith('/')
    ? `${baseURL}services/aigc/text2image/image-synthesis`
    : `${baseURL}/services/aigc/text2image/image-synthesis`;

  const requestBody = {
    model,
    input: {
      prompt,
    },
    parameters: {
      size: '1024*1024',
      n: 1,
    },
  };

  // 提交异步任务
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope 图像生成提交失败 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const taskData = await response.json();
  const taskId = taskData.output?.task_id;

  if (!taskId) {
    console.error('DashScope 响应:', JSON.stringify(taskData).substring(0, 500));
    throw new Error('DashScope 图像生成任务创建失败');
  }

  // 轮询任务状态
  const taskUrl = baseURL.endsWith('/')
    ? `${baseURL}tasks/${taskId}`
    : `${baseURL}/tasks/${taskId}`;

  let attempts = 0;
  const maxAttempts = 60; // 最多等待60次，每次2秒

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;

    const statusResponse = await fetch(taskUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      throw new Error(`DashScope 任务查询失败 (${statusResponse.status}): ${errorText.substring(0, 200)}`);
    }

    const statusData = await statusResponse.json();
    const taskStatus = statusData.output?.task_status;

    if (taskStatus === 'SUCCEEDED') {
      const imageUrl = statusData.output?.results?.[0]?.url;
      if (imageUrl) {
        return imageUrl;
      }
      console.error('DashScope 任务成功但无图片:', JSON.stringify(statusData).substring(0, 500));
      throw new Error('DashScope 图像生成成功但未返回图片URL');
    } else if (taskStatus === 'FAILED') {
      const errorMsg = statusData.output?.message || '未知错误';
      throw new Error(`DashScope 图像生成失败: ${errorMsg}`);
    }
    // PENDING 或 RUNNING 状态继续等待
  }

  throw new Error('DashScope 图像生成超时');
}

// 调用魔搭社区 ModelScope 图像 API
async function callModelScopeImageAPI(
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  // ModelScope 文生图 API 端点 (异步模式)
  const url = `${baseURL.replace(/\/$/, '')}/v1/images/generations`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-ModelScope-Async-Mode': 'true',
    },
    body: JSON.stringify({
      model,
      prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ModelScope 图像生成提交失败 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const taskData = await response.json();
  const taskId = taskData.task_id;

  if (!taskId) {
    const imageUrl = taskData.data?.[0]?.url || taskData.output_images?.[0];
    if (imageUrl) {
      return imageUrl;
    }
    console.error('ModelScope 响应:', JSON.stringify(taskData).substring(0, 500));
    throw new Error('ModelScope 图像生成任务创建失败');
  }

  // 轮询任务状态
  const taskUrl = `${baseURL.replace(/\/$/, '')}/v1/tasks/${taskId}`;

  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;

    const statusResponse = await fetch(taskUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-ModelScope-Task-Type': 'image_generation',
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      throw new Error(`ModelScope 任务查询失败 (${statusResponse.status}): ${errorText.substring(0, 200)}`);
    }

    const statusData = await statusResponse.json();
    const taskStatus = statusData.task_status;

    if (taskStatus === 'SUCCEED') {
      const imageUrl = statusData.output_images?.[0] || statusData.data?.[0]?.url;
      if (imageUrl) {
        return imageUrl;
      }
      throw new Error('ModelScope 图像生成成功但未返回图片URL');
    } else if (taskStatus === 'FAILED') {
      const errorMsg = statusData.message || '未知错误';
      throw new Error(`ModelScope 图像生成失败: ${errorMsg}`);
    }
  }

  throw new Error('ModelScope 图像生成超时');
}

// 调用 OpenAI 风格图像 API
async function callImageAPI(
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string,
  provider: string
): Promise<string> {
  // 阿里云 DashScope 使用特殊的 API 格式
  if (provider === 'qwen' || provider === 'dashscope' || provider === 'aliyun') {
    return callDashScopeImageAPI(baseURL, apiKey, model, prompt);
  }

  // 魔搭社区 ModelScope
  if (provider === 'modelscope' || baseURL.includes('modelscope.cn')) {
    return callModelScopeImageAPI(baseURL, apiKey, model, prompt);
  }

  const url = baseURL.endsWith('/') ? `${baseURL}images/generations` : `${baseURL}/images/generations`;

  let requestBody: any = {
    model,
    prompt,
    n: 1,
  };

  // OpenAI / DALL-E 风格
  if (provider === 'openai' || provider === 'azure') {
    requestBody.size = '1024x1024';
    requestBody.response_format = 'url';
  }
  // SiliconFlow (Flux 等)
  else if (provider === 'siliconflow') {
    requestBody.image_size = '1024x1024';
    requestBody.num_inference_steps = 25;
  }
  // 智谱 CogView
  else if (provider === 'zhipu') {
    requestBody.size = '1024x1024';
  }
  // 通用 OpenAI 兼容格式
  else {
    requestBody.size = '1024x1024';
    requestBody.response_format = 'url';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`图像生成失败 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();

  let imageUrl =
    data.data?.[0]?.url ||
    data.images?.[0]?.url ||
    data.data?.[0]?.b64_json ||
    data.output?.url ||
    '';

  if (data.data?.[0]?.b64_json) {
    imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
  }

  if (!imageUrl) {
    throw new Error('图像生成返回格式异常');
  }

  return imageUrl;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateImageRequest = await req.json();
    // 默认不追加风格，因为新流程生成的提示词已经是完整的
    const { prompt, profileId, imagePromptId, enhanceWithStyle = false } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: '请提供图片生成提示词' }, { status: 400 });
    }

    // 获取图像风格配置并增强 prompt（仅当明确要求时）
    let finalPrompt = prompt.trim();
    if (enhanceWithStyle) {
      const stylePrompt = await getImagePromptConfig(imagePromptId);
      if (stylePrompt) {
        finalPrompt = enhancePromptWithImageStyle(finalPrompt, stylePrompt);
      }
    }

    // 获取 AI 配置
    let aiConfig = null;

    // 优先使用指定的 profileId
    if (profileId) {
      const profile = await prisma.aIProfile.findFirst({
        where: { id: profileId, enabled: true },
      });
      if (profile && (profile.kind === 'image' || profile.kind === 'universal')) {
        aiConfig = {
          baseURL: profile.baseURL,
          apiKey: profile.apiKey,
          model: profile.model,
          provider: profile.provider,
          name: profile.name,
        };
      }
    }

    // 回退到默认 AIProfile (image 或 universal)
    if (!aiConfig) {
      const defaultProfile = await prisma.aIProfile.findFirst({
        where: {
          enabled: true,
          isDefault: true,
          kind: { in: ['image', 'universal'] },
        },
      });
      if (defaultProfile) {
        aiConfig = {
          baseURL: defaultProfile.baseURL,
          apiKey: defaultProfile.apiKey,
          model: defaultProfile.model,
          provider: defaultProfile.provider,
          name: defaultProfile.name,
        };
      }
    }

    // 回退到任意 image 类型的 AIProfile
    if (!aiConfig) {
      const imageProfile = await prisma.aIProfile.findFirst({
        where: {
          enabled: true,
          kind: 'image',
        },
      });
      if (imageProfile) {
        aiConfig = {
          baseURL: imageProfile.baseURL,
          apiKey: imageProfile.apiKey,
          model: imageProfile.model,
          provider: imageProfile.provider,
          name: imageProfile.name,
        };
      }
    }

    // 再回退到任意 universal 类型的 AIProfile
    if (!aiConfig) {
      const universalProfile = await prisma.aIProfile.findFirst({
        where: {
          enabled: true,
          kind: 'universal',
        },
      });
      if (universalProfile) {
        aiConfig = {
          baseURL: universalProfile.baseURL,
          apiKey: universalProfile.apiKey,
          model: universalProfile.model,
          provider: universalProfile.provider,
          name: universalProfile.name,
        };
      }
    }

    if (!aiConfig) {
      return NextResponse.json(
        { error: '没有可用的图像模型，请先在 AI 配置管理中添加' },
        { status: 503 }
      );
    }

    // 调用图像生成
    const imageUrl = await callImageAPI(
      aiConfig.baseURL,
      aiConfig.apiKey,
      aiConfig.model,
      finalPrompt,
      aiConfig.provider
    );

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        name: aiConfig.name,
      },
    });
  } catch (error: any) {
    console.error('图片生成失败:', error);
    return NextResponse.json(
      { error: error.message || '图片生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
