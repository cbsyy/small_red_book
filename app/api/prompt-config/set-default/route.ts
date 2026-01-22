import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '配置 ID 不能为空' },
        { status: 400 }
      );
    }

    // 获取要设为默认的配置
    const config = await prisma.promptConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    // 取消同类型的其他默认配置
    await prisma.promptConfig.updateMany({
      where: { kind: config.kind, isDefault: true },
      data: { isDefault: false },
    });

    // 设置新的默认配置
    await prisma.promptConfig.update({
      where: { id },
      data: { isDefault: true },
    });

    return NextResponse.json({ success: true, message: '已设为默认' });
  } catch (error: any) {
    console.error('设置默认配置失败:', error);
    return NextResponse.json(
      { success: false, error: '设置失败' },
      { status: 500 }
    );
  }
}
