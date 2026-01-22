import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_TEXT_PROMPT, DEFAULT_IMAGE_PROMPT } from '@/lib/prompts';

// 获取所有 Prompt 配置
export async function GET() {
  try {
    const configs = await prisma.promptConfig.findMany({
      orderBy: [{ kind: 'asc' }, { isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: configs });
  } catch (error: any) {
    console.error('获取 Prompt 配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 创建新的 Prompt 配置
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, kind, content, isDefault, enabled } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: '配置名称不能为空' },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt 内容不能为空' },
        { status: 400 }
      );
    }

    // 如果设为默认，先取消同类型的其他默认配置
    if (isDefault) {
      await prisma.promptConfig.updateMany({
        where: { kind, isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await prisma.promptConfig.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        kind: kind || 'text',
        content: content.trim(),
        isDefault: isDefault || false,
        enabled: enabled !== false,
      },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '配置名称已存在' },
        { status: 400 }
      );
    }
    console.error('创建 Prompt 配置失败:', error);
    return NextResponse.json(
      { success: false, error: '创建配置失败' },
      { status: 500 }
    );
  }
}

// 初始化默认配置
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // 如果是初始化请求
    if (body.action === 'init') {
      // 检查是否已有配置
      const existingText = await prisma.promptConfig.findFirst({
        where: { kind: 'text' },
      });
      const existingImage = await prisma.promptConfig.findFirst({
        where: { kind: 'image' },
      });

      const results = [];

      // 创建默认文本配置
      if (!existingText) {
        const textConfig = await prisma.promptConfig.create({
          data: {
            name: '默认文本 Prompt',
            description: '用于大纲生成的默认系统提示词',
            kind: 'text',
            content: DEFAULT_TEXT_PROMPT,
            isDefault: true,
            enabled: true,
          },
        });
        results.push(textConfig);
      }

      // 创建默认图像配置
      if (!existingImage) {
        const imageConfig = await prisma.promptConfig.create({
          data: {
            name: '默认图像 Prompt',
            description: '小红书信息图风格提示词',
            kind: 'image',
            content: DEFAULT_IMAGE_PROMPT,
            isDefault: true,
            enabled: true,
          },
        });
        results.push(imageConfig);
      }

      return NextResponse.json({
        success: true,
        message: results.length > 0 ? '初始化完成' : '配置已存在',
        data: results,
      });
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('初始化 Prompt 配置失败:', error);
    return NextResponse.json(
      { success: false, error: '初始化失败' },
      { status: 500 }
    );
  }
}
