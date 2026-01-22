import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 获取背景板列表
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const category = searchParams.get('category');
    const favorite = searchParams.get('favorite');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const where: any = {};

    if (source) {
      where.source = source;
    }
    if (category) {
      where.category = category;
    }
    if (favorite === 'true') {
      where.isFavorite = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // 查询
    const [items, total] = await Promise.all([
      prisma.backgroundImage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.backgroundImage.count({ where }),
    ]);

    // 解析 tags JSON
    const data = items.map(item => ({
      ...item,
      tags: JSON.parse(item.tags || '[]'),
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + items.length < total,
      },
    });
  } catch (error: any) {
    console.error('[Background API] 获取列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 创建/保存背景板
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      source = 'upload',
      prompt,
      imageUrl,
      thumbnailUrl,
      width = 0,
      height = 0,
      aspectRatio = '3:4',
      fileSize = 0,
      tags = [],
      category,
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: '图片 URL 不能为空' },
        { status: 400 }
      );
    }

    const item = await prisma.backgroundImage.create({
      data: {
        name: name || `背景板 ${Date.now()}`,
        description,
        source,
        prompt,
        imageUrl,
        thumbnailUrl,
        width,
        height,
        aspectRatio,
        fileSize,
        tags: JSON.stringify(tags),
        category,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        tags: JSON.parse(item.tags || '[]'),
      },
    });
  } catch (error: any) {
    console.error('[Background API] 创建失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
