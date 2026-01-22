import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 获取单个背景板
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const item = await prisma.backgroundImage.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: '背景板不存在' },
        { status: 404 }
      );
    }

    // 更新使用次数
    await prisma.backgroundImage.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        tags: JSON.parse(item.tags || '[]'),
      },
    });
  } catch (error: any) {
    console.error('[Background API] 获取失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 更新背景板（名称、标签、收藏等）
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { name, description, tags, category, isFavorite } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (category !== undefined) updateData.category = category;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

    const item = await prisma.backgroundImage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        tags: JSON.parse(item.tags || '[]'),
      },
    });
  } catch (error: any) {
    console.error('[Background API] 更新失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 删除背景板
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const item = await prisma.backgroundImage.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: '背景板不存在' },
        { status: 404 }
      );
    }

    // 不允许删除系统预设
    if (item.isPreset) {
      return NextResponse.json(
        { success: false, error: '系统预设不能删除' },
        { status: 403 }
      );
    }

    await prisma.backgroundImage.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error: any) {
    console.error('[Background API] 删除失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
