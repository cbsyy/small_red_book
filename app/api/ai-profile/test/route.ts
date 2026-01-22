import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST - 测试 AIProfile 连接
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

    const { id, profileId, baseURL, apiKey, model, kind, provider } = body;
    const actualId = id || profileId;

    let config: { baseURL: string; apiKey: string; model: string; kind: string; provider: string };

    // 如果提供 ID，从数据库获取配置
    if (actualId) {
      const profile = await prisma.aIProfile.findUnique({
        where: { id: actualId },
      });
      if (!profile) {
        return NextResponse.json(
          { success: false, error: '配置不存在' },
          { status: 404 }
        );
      }
      config = {
        baseURL: profile.baseURL,
        apiKey: profile.apiKey,
        model: profile.model,
        kind: profile.kind,
        provider: profile.provider,
      };
    } else {
      // 使用传入的配置
      if (!baseURL || !apiKey || !model) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数：baseURL, apiKey, model' },
          { status: 400 }
        );
      }
      config = { baseURL, apiKey, model, kind: kind || 'text', provider: provider || 'openai' };
    }

    // 根据类型测试模型
    if (config.kind === 'text' || config.kind === 'universal') {
      // 测试文本模型
      const textResult = await testTextModel(config.baseURL, config.apiKey, config.model);
      return NextResponse.json({
        success: textResult.success,
        data: { textModel: textResult },
        message: textResult.success ? '连接测试成功' : '测试失败，请检查配置',
      });
    } else if (config.kind === 'image') {
      // 测试图像模型
      const imageResult = await testImageEndpoint(config.baseURL, config.apiKey, config.model, config.provider);
      return NextResponse.json({
        success: imageResult.success,
        data: { imageModel: imageResult },
        message: imageResult.success ? '连接测试成功' : imageResult.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: '配置已保存（视频类型暂不支持测试）',
    });

  } catch (error: any) {
    console.error('测试 AIProfile 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '测试失败' },
      { status: 500 }
    );
  }
}

// 测试文本模型
async function testTextModel(baseURL: string, apiKey: string, model: string) {
  try {
    const url = baseURL.endsWith('/') ? `${baseURL}chat/completions` : `${baseURL}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        message: `连接失败 (${response.status}): ${error.substring(0, 100)}`,
      };
    }

    const data = await response.json();
    if (data.choices?.[0]?.message?.content !== undefined) {
      return {
        success: true,
        message: `文本模型 ${model} 连接成功`,
      };
    }

    return {
      success: false,
      message: '响应格式异常',
    };

  } catch (error: any) {
    return {
      success: false,
      message: `连接错误: ${error.message}`,
    };
  }
}

// 测试图像模型 - 真正调用图像生成 API
async function testImageEndpoint(baseURL: string, apiKey: string, model: string, provider: string) {
  try {
    const testPrompt = 'a simple red circle on white background';

    // 阿里云 DashScope
    if (provider === 'qwen' || provider === 'dashscope' || provider === 'aliyun') {
      // 检查是否是图像编辑模型（需要输入图片，不支持纯文生图）
      if (model.includes('image-edit')) {
        return {
          success: false,
          message: `模型 ${model} 是图像编辑模型，需要输入图片。请使用文生图模型如 wanx-v1 或 wanx2.1-t2i-turbo`,
          skipped: false,
        };
      }

      // DashScope 文生图 API
      const url = baseURL.endsWith('/')
        ? `${baseURL}services/aigc/text2image/image-synthesis`
        : `${baseURL}/services/aigc/text2image/image-synthesis`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model,
          input: { prompt: testPrompt },
          parameters: { size: '512*512', n: 1 },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `DashScope 测试失败 (${response.status}): ${errorText.substring(0, 100)}`,
          skipped: false,
        };
      }

      const data = await response.json();
      if (data.output?.task_id) {
        return {
          success: true,
          message: `图像模型 ${model} 测试成功`,
          skipped: false,
        };
      }

      return {
        success: false,
        message: `DashScope 响应异常: ${JSON.stringify(data).substring(0, 100)}`,
        skipped: false,
      };
    }

    // 魔搭社区 ModelScope
    if (provider === 'modelscope' || baseURL.includes('modelscope.cn')) {
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
          prompt: testPrompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `ModelScope 测试失败 (${response.status}): ${errorText.substring(0, 100)}`,
          skipped: false,
        };
      }

      const data = await response.json();
      if (data.task_id || data.data?.[0]?.url || data.output_images?.[0]) {
        return {
          success: true,
          message: `图像模型 ${model} 测试成功`,
          skipped: false,
        };
      }

      return {
        success: false,
        message: `ModelScope 响应异常: ${JSON.stringify(data).substring(0, 100)}`,
        skipped: false,
      };
    }

    // OpenAI 风格 API
    const url = baseURL.endsWith('/') ? `${baseURL}images/generations` : `${baseURL}/images/generations`;

    const requestBody: any = {
      model,
      prompt: testPrompt,
      n: 1,
      size: '256x256',
    };

    // SiliconFlow 特殊参数
    if (provider === 'siliconflow') {
      requestBody.image_size = '256x256';
      delete requestBody.size;
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
      return {
        success: false,
        message: `图像 API 测试失败 (${response.status}): ${errorText.substring(0, 100)}`,
        skipped: false,
      };
    }

    const data = await response.json();
    if (data.data?.[0]?.url || data.data?.[0]?.b64_json || data.images?.[0]) {
      return {
        success: true,
        message: `图像模型 ${model} 测试成功`,
        skipped: false,
      };
    }

    return {
      success: false,
      message: `图像 API 响应格式异常`,
      skipped: false,
    };

  } catch (error: any) {
    return {
      success: false,
      message: `测试错误: ${error.message}`,
      skipped: false,
    };
  }
}
