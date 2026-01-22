import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST - 设置默认 AIProfile
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

    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少配置 ID' },
        { status: 400 }
      );
    }

    // 检查目标配置是否存在
    const targetProfile = await prisma.aIProfile.findUnique({
      where: { id },
    });

    if (!targetProfile) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    if (!targetProfile.enabled) {
      return NextResponse.json(
        { success: false, error: '该配置已禁用，无法设为默认' },
        { status: 400 }
      );
    }

    // 使用事务：取消所有默认，然后设置新默认
    await prisma.$transaction([
      // 取消所有默认
      prisma.aIProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      // 设置新默认
      prisma.aIProfile.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    // 获取更新后的配置
    const updatedProfile = await prisma.aIProfile.findUnique({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedProfile!.id,
        name: updatedProfile!.name,
        isDefault: updatedProfile!.isDefault,
      },
      message: `已将「${updatedProfile!.name}」设为默认配置`,
    });

  } catch (error: any) {
    console.error('设置默认配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '设置失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// GET - 获取当前默认 AIProfile
export async function GET() {
  try {
    const defaultProfile = await prisma.aIProfile.findFirst({
      where: { isDefault: true, enabled: true },
    });

    if (!defaultProfile) {
      return NextResponse.json({
        success: true,
        data: null,
        message: '暂无默认配置',
      });
    }

    // 隐藏 API Key
    const safeProfile = {
      id: defaultProfile.id,
      name: defaultProfile.name,
      description: defaultProfile.description,
      kind: defaultProfile.kind,
      provider: defaultProfile.provider,
      baseURL: defaultProfile.baseURL,
      model: defaultProfile.model,
      isDefault: defaultProfile.isDefault,
      enabled: defaultProfile.enabled,
    };

    return NextResponse.json({
      success: true,
      data: safeProfile,
    });

  } catch (error: any) {
    console.error('获取默认配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    );
  }
}
