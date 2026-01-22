import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取单个风格
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const style = await prisma.imageStyle.findUnique({
      where: { id },
    });

    if (!style) {
      return NextResponse.json(
        { success: false, error: '风格不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: style,
    });
  } catch (error: any) {
    console.error('获取图像风格失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取图像风格失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新风格
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, nameEn, icon, promptSnippet, enabled, order } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (nameEn !== undefined) updateData.nameEn = nameEn.trim();
    if (icon !== undefined) updateData.icon = icon;
    if (promptSnippet !== undefined) updateData.promptSnippet = promptSnippet.trim();
    if (enabled !== undefined) updateData.enabled = enabled;
    if (order !== undefined) updateData.order = order;

    const style = await prisma.imageStyle.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: style,
    });
  } catch (error: any) {
    console.error('更新图像风格失败:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '风格不存在' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '该风格名称已存在' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || '更新图像风格失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除风格
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.imageStyle.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error: any) {
    console.error('删除图像风格失败:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '风格不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || '删除图像风格失败' },
      { status: 500 }
    );
  }
}
