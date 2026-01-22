import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 默认风格数据
const DEFAULT_STYLES = [
  { name: '动漫', nameEn: 'anime', icon: '🎌', promptSnippet: 'anime illustration style, vibrant colors, expressive characters, manga-inspired', order: 1 },
  { name: '科幻', nameEn: 'sci-fi', icon: '🚀', promptSnippet: 'futuristic sci-fi style, neon lights, high-tech elements, holographic displays', order: 2 },
  { name: '简约', nameEn: 'minimal', icon: '✨', promptSnippet: 'clean minimalist style, simple geometric shapes, plenty of white space, modern', order: 3 },
  { name: '可爱', nameEn: 'cute', icon: '🐱', promptSnippet: 'cute kawaii style, pastel colors, adorable icons, rounded shapes, friendly', order: 4 },
  { name: '专业', nameEn: 'professional', icon: '📊', promptSnippet: 'professional infographic style, clean layout, business-appropriate, data visualization', order: 5 },
  { name: '水彩', nameEn: 'watercolor', icon: '🎨', promptSnippet: 'soft watercolor painting style, gentle gradients, artistic brush strokes, dreamy', order: 6 },
  { name: '复古', nameEn: 'vintage', icon: '📻', promptSnippet: 'vintage retro style, muted warm colors, nostalgic feel, classic design elements', order: 7 },
  { name: '赛博朋克', nameEn: 'cyberpunk', icon: '🌃', promptSnippet: 'cyberpunk aesthetic, neon pink and cyan, dark background, glitch effects, urban', order: 8 },
  { name: '扁平化', nameEn: 'flat', icon: '📱', promptSnippet: 'flat design style, solid colors, no shadows, simple icons, modern UI aesthetic', order: 9 },
  { name: '手绘', nameEn: 'handdrawn', icon: '✏️', promptSnippet: 'hand-drawn sketch style, pencil strokes, organic lines, personal touch', order: 10 },
];

// GET - 获取所有风格
export async function GET() {
  try {
    let styles = await prisma.imageStyle.findMany({
      where: { enabled: true },
      orderBy: { order: 'asc' },
    });

    // 如果没有数据，初始化默认风格
    if (styles.length === 0) {
      await prisma.imageStyle.createMany({
        data: DEFAULT_STYLES,
      });
      styles = await prisma.imageStyle.findMany({
        where: { enabled: true },
        orderBy: { order: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      data: styles,
    });
  } catch (error: any) {
    console.error('获取图像风格失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取图像风格失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新风格
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, nameEn, icon, promptSnippet } = body;

    if (!name?.trim() || !promptSnippet?.trim()) {
      return NextResponse.json(
        { success: false, error: '名称和提示词片段不能为空' },
        { status: 400 }
      );
    }

    // 获取最大 order
    const maxOrder = await prisma.imageStyle.aggregate({
      _max: { order: true },
    });

    const style = await prisma.imageStyle.create({
      data: {
        name: name.trim(),
        nameEn: nameEn?.trim() || name.trim().toLowerCase(),
        icon: icon || '🏷️',
        promptSnippet: promptSnippet.trim(),
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      data: style,
    });
  } catch (error: any) {
    console.error('创建图像风格失败:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '该风格名称已存在' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || '创建图像风格失败' },
      { status: 500 }
    );
  }
}
