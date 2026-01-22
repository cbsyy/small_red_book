import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取单个 AIProfile
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const profile = await prisma.aIProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    // 隐藏 API Key
    const safeProfile = {
      ...profile,
      apiKey: profile.apiKey ? `${profile.apiKey.substring(0, 8)}...${profile.apiKey.slice(-4)}` : '',
    };

    return NextResponse.json({
      success: true,
      data: safeProfile,
    });

  } catch (error: any) {
    console.error('获取 AIProfile 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新 AIProfile
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 检查是否存在
    const existing = await prisma.aIProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    // 检查名称是否重复（排除自身）
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.aIProfile.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: '配置名称已存在' },
          { status: 400 }
        );
      }
    }

    // 如果设置为默认，先取消其他默认
    if (isDefault && !existing.isDefault) {
      await prisma.aIProfile.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // 构建更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (kind !== undefined) updateData.kind = kind;
    if (provider !== undefined) updateData.provider = provider;
    if (baseURL !== undefined) updateData.baseURL = baseURL.trim().replace(/\/$/, '');
    if (model !== undefined) updateData.model = model.trim();
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt?.trim() || null;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (enabled !== undefined) updateData.enabled = enabled;

    // 只有明确提供新的 apiKey 时才更新（不包含 ... 的才是新值）
    if (apiKey && !apiKey.includes('...')) {
      updateData.apiKey = apiKey.trim();
    }

    const profile = await prisma.aIProfile.update({
      where: { id },
      data: updateData,
    });

    // 隐藏 API Key
    const safeProfile = {
      ...profile,
      apiKey: profile.apiKey ? `${profile.apiKey.substring(0, 8)}...${profile.apiKey.slice(-4)}` : '',
    };

    return NextResponse.json({
      success: true,
      data: safeProfile,
      message: '更新成功',
    });

  } catch (error: any) {
    console.error('更新 AIProfile 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除 AIProfile
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查是否存在
    const existing = await prisma.aIProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    await prisma.aIProfile.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `配置「${existing.name}」已删除`,
    });

  } catch (error: any) {
    console.error('删除 AIProfile 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '删除失败' },
      { status: 500 }
    );
  }
}
