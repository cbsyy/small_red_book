import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取所有 AIProfile
export async function GET() {
  try {
    const profiles = await prisma.aIProfile.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // 隐藏 API Key 的完整内容
    const safeProfiles = profiles.map((p) => ({
      ...p,
      apiKey: p.apiKey ? `${p.apiKey.substring(0, 8)}...${p.apiKey.slice(-4)}` : '',
    }));

    return NextResponse.json({
      success: true,
      data: safeProfiles,
    });

  } catch (error: any) {
    console.error('获取 AIProfile 列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新的 AIProfile
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

    const {
      name,
      description,
      kind,
      provider,
      baseURL,
      apiKey,
      model,
      systemPrompt,
      isDefault,
      enabled,
    } = body;

    // 验证必填字段
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: '配置名称不能为空' },
        { status: 400 }
      );
    }
    if (!baseURL?.trim()) {
      return NextResponse.json(
        { success: false, error: 'API 地址不能为空' },
        { status: 400 }
      );
    }
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { success: false, error: 'API Key 不能为空' },
        { status: 400 }
      );
    }
    if (!model?.trim()) {
      return NextResponse.json(
        { success: false, error: '模型 ID 不能为空' },
        { status: 400 }
      );
    }

    // 检查名称是否重复
    const existing = await prisma.aIProfile.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '配置名称已存在' },
        { status: 400 }
      );
    }

    // 如果设置为默认，先取消其他默认
    if (isDefault) {
      await prisma.aIProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const profile = await prisma.aIProfile.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        kind: kind || 'text',
        provider: provider || 'openai',
        baseURL: baseURL.trim().replace(/\/$/, ''), // 移除末尾斜杠
        apiKey: apiKey.trim(),
        model: model.trim(),
        systemPrompt: systemPrompt?.trim() || null,
        isDefault: isDefault || false,
        enabled: enabled !== false,
      },
    });

    // 隐藏 API Key
    const safeProfile = {
      ...profile,
      apiKey: `${profile.apiKey.substring(0, 8)}...${profile.apiKey.slice(-4)}`,
    };

    return NextResponse.json(
      {
        success: true,
        data: safeProfile,
        message: '创建成功',
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('创建 AIProfile 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建失败' },
      { status: 500 }
    );
  }
}
