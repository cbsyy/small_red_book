'use server';

import { scrapeUrl, type ScrapedContent } from '@/lib/scraper';

export interface ParseResult {
  success: boolean;
  data?: {
    title: string;
    content: string;
    images: string[];
    source: string;
  };
  error?: string;
}

/**
 * Server Action: 解析 URL 内容
 * 支持微信公众号、知乎、简书、掘金等平台
 */
export async function parseUrl(url: string): Promise<ParseResult> {
  try {
    // 验证 URL
    if (!url?.trim()) {
      return { success: false, error: '请提供文章链接' };
    }

    try {
      new URL(url);
    } catch {
      return { success: false, error: '无效的链接格式' };
    }

    // 调用 scraper
    const result = await scrapeUrl(url);

    // 验证内容
    if (!result.content || result.content.length < 50) {
      return { success: false, error: '无法提取文章内容，请检查链接是否正确' };
    }

    return {
      success: true,
      data: {
        title: result.title,
        content: result.content,
        images: result.images,
        source: result.source,
      },
    };
  } catch (error: any) {
    console.error('解析 URL 失败:', error);
    return {
      success: false,
      error: error.message || '解析失败，请稍后重试',
    };
  }
}

/**
 * Server Action: 解析纯文本（直接返回）
 */
export async function parseText(text: string): Promise<ParseResult> {
  if (!text?.trim()) {
    return { success: false, error: '请提供文本内容' };
  }

  if (text.length > 50000) {
    return { success: false, error: '文本内容过长，请控制在 50000 字以内' };
  }

  return {
    success: true,
    data: {
      title: '',
      content: text.trim(),
      images: [],
      source: 'text',
    },
  };
}

/**
 * Server Action: 解析上传文件
 * 目前仅支持 txt 文件，PDF/DOCX 需要额外库
 */
export async function parseFile(content: string, fileName: string): Promise<ParseResult> {
  if (!content?.trim()) {
    return { success: false, error: '文件内容为空' };
  }

  // 从文件名提取标题
  const title = fileName.replace(/\.[^.]+$/, '');

  return {
    success: true,
    data: {
      title,
      content: content.trim(),
      images: [],
      source: 'file',
    },
  };
}
