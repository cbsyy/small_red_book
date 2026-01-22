/**
 * 图片 Prompt JSON → 字符串转换器
 * 将结构化的 JSON 转换为文生图模型可用的 prompt 字符串
 */

import type { ImagePromptJSON, BackgroundTheme, PatternType } from './types/card';

/**
 * 主题风格映射
 */
const THEME_PROMPTS: Record<BackgroundTheme, string> = {
  'xiaohongshu-warm': 'xiaohongshu style knowledge card background, warm cream and coral tones, cozy aesthetic',
  'xiaohongshu-cool': 'xiaohongshu style knowledge card background, cool mint and sky blue tones, fresh aesthetic',
  'minimalist-white': 'minimalist white background, clean simple design, subtle shadows',
  'minimalist-dark': 'minimalist dark background, elegant deep tones, sophisticated design',
  'gradient-sunset': 'beautiful sunset gradient background, warm orange pink purple tones',
  'gradient-ocean': 'ocean gradient background, deep blue to turquoise tones, calming',
  'nature-leaf': 'natural background with botanical leaf elements, organic aesthetic',
  'nature-floral': 'floral background with soft flower elements, romantic aesthetic',
  'geometric-modern': 'modern geometric background, clean shapes and lines, contemporary design',
  'abstract-fluid': 'abstract fluid background, flowing organic shapes, artistic',
  'tech-grid': 'tech style background with subtle grid pattern, modern digital aesthetic',
  'vintage-paper': 'vintage paper texture background, aged warm tones, nostalgic feel',
  'custom': 'custom style background',
};

/**
 * 图案类型映射
 */
const PATTERN_PROMPTS: Record<PatternType, string> = {
  'leaves': 'decorative leaf elements',
  'flowers': 'soft floral decorations',
  'dots': 'polka dot pattern',
  'circles': 'circular ring elements',
  'geometric-shapes': 'geometric shapes like triangles squares',
  'waves': 'flowing wave patterns',
  'lines': 'decorative line elements',
  'blobs': 'organic blob shapes',
  'stars': 'star decorations',
  'sparkles': 'sparkle glitter elements',
  'clouds': 'soft cloud shapes',
  'abstract': 'abstract decorative elements',
  'grid': 'subtle grid pattern',
  'none': '',
};

/**
 * 位置映射
 */
const POSITION_PROMPTS: Record<string, string> = {
  'corners': 'in the corners',
  'top': 'at the top',
  'bottom': 'at the bottom',
  'left': 'on the left side',
  'right': 'on the right side',
  'scattered': 'scattered throughout',
  'border': 'along the border',
  'center': 'in the center area',
};

/**
 * 明显程度映射
 */
const STYLE_PROMPTS: Record<string, string> = {
  'subtle': 'subtle and soft',
  'moderate': 'moderately visible',
  'prominent': 'prominent and bold',
};

/**
 * 氛围映射
 */
const MOOD_PROMPTS: Record<string, string> = {
  'warm': 'warm cozy inviting mood',
  'cool': 'cool calm refreshing mood',
  'neutral': 'neutral balanced mood',
  'vibrant': 'vibrant energetic mood',
  'soft': 'soft gentle soothing mood',
  'bold': 'bold striking confident mood',
};

/**
 * 质感映射
 */
const TEXTURE_PROMPTS: Record<string, string> = {
  'smooth': 'smooth clean texture',
  'paper': 'paper texture',
  'fabric': 'fabric texture',
  'glossy': 'glossy shiny finish',
  'matte': 'matte finish',
  'grain': 'subtle grain texture',
};

/**
 * 将 ImagePromptJSON 转换为 prompt 字符串
 */
export function convertJSONToPrompt(json: ImagePromptJSON): string {
  const parts: string[] = [];

  // 1. 主题风格
  parts.push(THEME_PROMPTS[json.theme] || THEME_PROMPTS['custom']);

  // 2. 配色
  const colorDesc = [
    json.colors.background && `${json.colors.background} background`,
    json.colors.primary && `${json.colors.primary} as primary color`,
    json.colors.secondary && `${json.colors.secondary} as secondary accent`,
    json.colors.accent && `${json.colors.accent} accent highlights`,
  ].filter(Boolean).join(', ');
  if (colorDesc) parts.push(colorDesc);

  // 3. 渐变
  if (json.gradient) {
    const gradientDir = json.gradient.direction === 'top-bottom' ? 'vertical'
      : json.gradient.direction === 'left-right' ? 'horizontal'
      : json.gradient.direction === 'diagonal' ? 'diagonal'
      : 'radial';
    parts.push(`${gradientDir} ${json.gradient.type} gradient with ${json.gradient.colors.join(' to ')}`);
  }

  // 4. 装饰图案
  json.patterns.forEach(pattern => {
    if (pattern.type === 'none') return;
    const patternPrompt = PATTERN_PROMPTS[pattern.type];
    const positionPrompt = POSITION_PROMPTS[pattern.position] || '';
    const stylePrompt = STYLE_PROMPTS[pattern.style] || '';
    const colorNote = pattern.color ? `in ${pattern.color}` : '';
    parts.push(`${stylePrompt} ${patternPrompt} ${positionPrompt} ${colorNote}`.trim());
  });

  // 5. 氛围
  if (json.mood) {
    parts.push(MOOD_PROMPTS[json.mood] || '');
  }

  // 6. 质感
  if (json.texture) {
    parts.push(TEXTURE_PROMPTS[json.texture] || '');
  }

  // 7. 额外描述
  if (json.additionalDescription) {
    parts.push(json.additionalDescription);
  }

  // 8. 质量和规格
  const qualityMap = {
    'standard': 'high quality',
    'high': 'high quality detailed',
    '4k': 'ultra high quality 4K resolution',
  };
  parts.push(qualityMap[json.quality] || 'high quality');
  parts.push(`aspect ratio ${json.aspectRatio}`);

  // 9. 强制无文字（重要！）
  parts.push('no text, no words, no letters, no characters, no typography, text-free');

  // 组合并清理
  return parts
    .filter(Boolean)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join(', ');
}

/**
 * 生成负面提示词
 */
export function generateNegativePrompt(): string {
  return [
    'text', 'words', 'letters', 'characters', 'typography', 'writing',
    'watermark', 'logo', 'signature', 'label', 'caption',
    'blurry', 'low quality', 'ugly', 'distorted',
    'human', 'person', 'face', 'portrait',
    'photorealistic photo',
  ].join(', ');
}

/**
 * 预设模板：小红书暖色风格
 */
export const PRESET_XIAOHONGSHU_WARM: ImagePromptJSON = {
  theme: 'xiaohongshu-warm',
  colors: {
    primary: 'coral orange',
    secondary: 'teal',
    background: 'cream',
  },
  gradient: {
    type: 'linear',
    direction: 'top-bottom',
    colors: ['#FFF8F0', '#FFE4D6'],
  },
  patterns: [
    { type: 'leaves', position: 'corners', style: 'subtle', color: 'soft green' },
    { type: 'dots', position: 'scattered', style: 'subtle', color: 'coral' },
  ],
  mood: 'warm',
  texture: 'smooth',
  aspectRatio: '3:4',
  quality: '4k',
  noText: true,
};

/**
 * 预设模板：极简白色
 */
export const PRESET_MINIMALIST_WHITE: ImagePromptJSON = {
  theme: 'minimalist-white',
  colors: {
    primary: 'soft gray',
    secondary: 'light blue',
    background: 'pure white',
  },
  patterns: [
    { type: 'geometric-shapes', position: 'corners', style: 'subtle' },
  ],
  mood: 'neutral',
  texture: 'smooth',
  aspectRatio: '3:4',
  quality: '4k',
  noText: true,
};

/**
 * 预设模板：自然叶子
 */
export const PRESET_NATURE_LEAF: ImagePromptJSON = {
  theme: 'nature-leaf',
  colors: {
    primary: 'forest green',
    secondary: 'sage',
    background: 'soft beige',
  },
  gradient: {
    type: 'linear',
    direction: 'diagonal',
    colors: ['#F5F5DC', '#E8F5E9'],
  },
  patterns: [
    { type: 'leaves', position: 'corners', style: 'prominent', color: 'green' },
    { type: 'leaves', position: 'scattered', style: 'subtle', color: 'light green' },
  ],
  mood: 'soft',
  texture: 'paper',
  aspectRatio: '3:4',
  quality: '4k',
  noText: true,
};
