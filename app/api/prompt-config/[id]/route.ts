import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取单个配置
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const config = await prisma.promptConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    console.error('获取配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 更新配置
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, kind, content, isDefault, enabled } = body;

    // 检查配置是否存在
    const existing = await prisma.promptConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    // 如果设为默认，先取消同类型的其他默认配置
    if (isDefault && !existing.isDefault) {
      await prisma.promptConfig.updateMany({
        where: { kind: kind || existing.kind, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (kind !== undefined) updateData.kind = kind;
    if (content !== undefined) updateData.content = content.trim();
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (enabled !== undefined) updateData.enabled = enabled;

    const config = await prisma.promptConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '配置名称已存在' },
        { status: 400 }
      );
    }
    console.error('更新配置失败:', error);
    return NextResponse.json(
      { success: false, error: '更新配置失败' },
      { status: 500 }
    );
  }
}

// 删除配置
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.promptConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }
    console.error('删除配置失败:', error);
    return NextResponse.json(
      { success: false, error: '删除配置失败' },
      { status: 500 }
    );
  }
}
