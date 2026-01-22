import * as cheerio from 'cheerio';

export interface ScrapedContent {
  title: string;
  content: string;
  images: string[];
  source: string;
  url: string;
}

// 检测文章来源
function detectSource(url: string): string {
  if (url.includes('mp.weixin.qq.com')) return 'wechat';
  if (url.includes('zhihu.com')) return 'zhihu';
  if (url.includes('jianshu.com')) return 'jianshu';
  if (url.includes('juejin.cn')) return 'juejin';
  if (url.includes('csdn.net')) return 'csdn';
  if (url.includes('toutiao.com') || url.includes('toutiaocdn.com')) return 'toutiao';
  return 'generic';
}

// 微信公众号文章解析
function parseWechat($: cheerio.CheerioAPI): Partial<ScrapedContent> {
  const title = $('#activity-name').text().trim() || $('h1').first().text().trim();
  const content = $('#js_content').text().trim();
  const images: string[] = [];

  $('#js_content img').each((_, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src');
    if (src) images.push(src);
  });

  return { title, content, images };
}

// 知乎文章解析
function parseZhihu($: cheerio.CheerioAPI): Partial<ScrapedContent> {
  const title = $('h1.Post-Title').text().trim() || $('h1').first().text().trim();
  const content = $('.Post-RichTextContainer').text().trim() || $('.RichContent-inner').text().trim();
  const images: string[] = [];

  $('.Post-RichTextContainer img, .RichContent-inner img').each((_, el) => {
    const src = $(el).attr('data-original') || $(el).attr('src');
    if (src && !src.includes('equation')) images.push(src);
  });

  return { title, content, images };
}

// 简书文章解析
function parseJianshu($: cheerio.CheerioAPI): Partial<ScrapedContent> {
  const title = $('h1.title').text().trim() || $('h1').first().text().trim();
  const content = $('article').text().trim();
  const images: string[] = [];

  $('article img').each((_, el) => {
    const src = $(el).attr('data-original-src') || $(el).attr('src');
    if (src) images.push(src);
  });

  return { title, content, images };
}

// 掘金文章解析
function parseJuejin($: cheerio.CheerioAPI): Partial<ScrapedContent> {
  const title = $('h1.article-title').text().trim() || $('h1').first().text().trim();
  const content = $('.markdown-body').text().trim() || $('article').text().trim();
  const images: string[] = [];

  $('.markdown-body img, article img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) images.push(src);
  });

  return { title, content, images };
}

// 通用解析
function parseGeneric($: cheerio.CheerioAPI): Partial<ScrapedContent> {
  // 尝试多种标题选择器
  const title = $('h1').first().text().trim() ||
    $('title').text().trim() ||
    $('meta[property="og:title"]').attr('content') || '';

  // 尝试提取正文
  // 优先选择 article 标签
  let content = $('article').text().trim();

  // 如果没有 article，尝试常见的内容容器
  if (!content) {
    const contentSelectors = [
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '#content',
      '.main-content',
    ];

    for (const selector of contentSelectors) {
      content = $(selector).text().trim();
      if (content && content.length > 100) break;
    }
  }

  // 如果还是没有，取 body 但去掉脚本和样式
  if (!content || content.length < 100) {
    $('script, style, nav, header, footer, aside').remove();
    content = $('body').text().trim();
  }

  // 提取图片
  const images: string[] = [];
  $('article img, .content img, main img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('logo') && !src.includes('icon')) {
      images.push(src);
    }
  });

  return { title, content, images };
}

// 清理文本
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // 多个空白变成单个空格
    .replace(/\n\s*\n/g, '\n\n')  // 多个换行变成两个
    .trim();
}

// 主抓取函数
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const source = detectSource(url);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`抓取失败: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  let parsed: Partial<ScrapedContent>;

  switch (source) {
    case 'wechat':
      parsed = parseWechat($);
      break;
    case 'zhihu':
      parsed = parseZhihu($);
      break;
    case 'jianshu':
      parsed = parseJianshu($);
      break;
    case 'juejin':
      parsed = parseJuejin($);
      break;
    default:
      parsed = parseGeneric($);
  }

  return {
    title: cleanText(parsed.title || ''),
    content: cleanText(parsed.content || ''),
    images: parsed.images || [],
    source,
    url,
  };
}
