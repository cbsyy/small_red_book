import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url?.trim()) {
      return NextResponse.json({ error: '请提供文章链接' }, { status: 400 });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: '无效的链接格式' }, { status: 400 });
    }

    const result = await scrapeUrl(url);

    if (!result.content || result.content.length < 50) {
      return NextResponse.json(
        { error: '无法提取文章内容，请检查链接是否正确' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('抓取失败:', error);
    return NextResponse.json(
      { error: error.message || '抓取失败，请稍后重试' },
      { status: 500 }
    );
  }
}
