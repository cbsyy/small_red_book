import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取图像模型配置（image/universal 类型）
async function getImageModelConfig() {
  // 优先使用默认 AIProfile (image 或 universal)
  const aiProfile = await prisma.aIProfile.findFirst({
    where: {
      enabled: true,
      isDefault: true,
      kind: { in: ['image', 'universal'] },
    },
  });

  if (aiProfile) {
    return {
      baseURL: aiProfile.baseURL,
      apiKey: aiProfile.apiKey,
      model: aiProfile.model,
      provider: aiProfile.provider,
      name: aiProfile.name,
    };
  }

  // 回退到任意 image 类型的 AIProfile
  const imageProfile = await prisma.aIProfile.findFirst({
    where: {
      enabled: true,
      kind: 'image',
    },
  });

  if (imageProfile) {
    return {
      baseURL: imageProfile.baseURL,
      apiKey: imageProfile.apiKey,
      model: imageProfile.model,
      provider: imageProfile.provider,
      name: imageProfile.name,
    };
  }

  // 再回退到任意 universal 类型的 AIProfile
  const universalProfile = await prisma.aIProfile.findFirst({
    where: {
      enabled: true,
      kind: 'universal',
    },
  });

  if (universalProfile) {
    return {
      baseURL: universalProfile.baseURL,
      apiKey: universalProfile.apiKey,
      model: universalProfile.model,
      provider: universalProfile.provider,
      name: universalProfile.name,
    };
  }

  return null;
}

// 根据 profileId 获取图像模型配置
async function getImageModelConfigByProfileId(profileId: string) {
  const aiProfile = await prisma.aIProfile.findUnique({
    where: { id: profileId, enabled: true },
  });

  if (aiProfile && (aiProfile.kind === 'image' || aiProfile.kind === 'universal')) {
    return {
      baseURL: aiProfile.baseURL,
      apiKey: aiProfile.apiKey,
      model: aiProfile.model,
      provider: aiProfile.provider,
      name: aiProfile.name,
    };
  }

  return null;
}

// 调用阿里云 DashScope 图像 API
async function callDashScopeImageAPI(
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  // 检查是否是图像编辑模型（需要输入图片，不支持纯文生图）
  if (model.includes('image-edit')) {
    throw new Error(`模型 ${model} 是图像编辑模型，需要输入图片。请在 AI 配置中使用文生图模型如 wanx-v1 或 wanx2.1-t2i-turbo`);
  }

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
    // 可能是同步返回结果
    const imageUrl = taskData.data?.[0]?.url || taskData.output_images?.[0];
    if (imageUrl) {
      return imageUrl;
    }
    console.error('ModelScope 响应:', JSON.stringify(taskData).substring(0, 500));
    throw new Error('ModelScope 图像生成任务创建失败');
  }

  // 轮询任务状态
  const taskUrl = `${baseURL.replace(/\/$/, '')}/v1/tasks/${taskId}`;
  console.log('ModelScope 任务ID:', taskId, '查询URL:', taskUrl);

  let attempts = 0;
  const maxAttempts = 60; // 最多等待60次，每次2秒

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
    console.log(`ModelScope 轮询 #${attempts}:`, JSON.stringify(statusData).substring(0, 300));

    if (taskStatus === 'SUCCEED') {
      const imageUrl = statusData.output_images?.[0] || statusData.data?.[0]?.url;
      if (imageUrl) {
        return imageUrl;
      }
      console.error('ModelScope 任务成功但无图片:', JSON.stringify(statusData).substring(0, 500));
      throw new Error('ModelScope 图像生成成功但未返回图片URL');
    } else if (taskStatus === 'FAILED') {
      const errorMsg = statusData.message || '未知错误';
      throw new Error(`ModelScope 图像生成失败: ${errorMsg}`);
    }
    // PENDING 或 RUNNING 状态继续等待
  }

  throw new Error('ModelScope 图像生成超时');
}

// 调用 OpenAI 风格图像 API（DALL-E, SiliconFlow 等）
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

  // 根据不同 provider 构建请求体
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

  // 尝试从不同的响应格式中提取 URL
  let imageUrl =
    data.data?.[0]?.url ||
    data.images?.[0]?.url ||
    data.data?.[0]?.b64_json ||
    data.output?.url ||
    '';

  // 如果返回的是 base64，转换为 data URL
  if (data.data?.[0]?.b64_json) {
    imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
  }

  if (!imageUrl) {
    console.error('图像 API 响应:', JSON.stringify(data).substring(0, 500));
    throw new Error('图像生成返回格式异常');
  }

  return imageUrl;
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

    const { prompt, profileId } = body;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: '图片提示词不能为空' },
        { status: 400 }
      );
    }

    // 获取图像模型配置：优先使用 profileId，否则使用默认配置
    let config = null;
    if (profileId) {
      config = await getImageModelConfigByProfileId(profileId);
    }
    if (!config) {
      config = await getImageModelConfig();
    }

    if (!config) {
      return NextResponse.json(
        { success: false, error: '没有可用的图像模型配置，请先在 AI 配置管理中添加' },
        { status: 503 }
      );
    }

    // 调用图像生成 API
    const imageUrl = await callImageAPI(
      config.baseURL,
      config.apiKey,
      config.model,
      prompt.trim(),
      config.provider
    );

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        prompt: prompt.trim(),
        model: config.model,
        name: config.name,
      },
    });

  } catch (error: any) {
    console.error('生成图片失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成图片失败，请稍后重试' },
      { status: 500 }
    );
  }
}
