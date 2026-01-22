// ==================== 画布元素类型 ====================

export type ElementType = 'text' | 'image' | 'rect' | 'circle' | 'line';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  fill: string;
  lineHeight: number;
  // 数据绑定
  bindingField?: string; // 如 {{title}}
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fit: 'fill' | 'contain' | 'cover';
  // 数据绑定
  bindingField?: string; // 如 {{image}}
}

export interface RectElement extends BaseElement {
  type: 'rect';
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  stroke: string;
  strokeWidth: number;
  x2: number;
  y2: number;
}

export type CanvasElement = TextElement | ImageElement | RectElement | CircleElement | LineElement;

// ==================== 模板类型 ====================

export interface CanvasSize {
  width: number;
  height: number;
  name: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  canvasSize: CanvasSize;
  backgroundColor: string;
  elements: CanvasElement[];
  createdAt: number;
  updatedAt: number;
}

// 预设画布尺寸
export const CANVAS_PRESETS: CanvasSize[] = [
  { width: 1080, height: 1440, name: '小红书竖图 3:4' },
  { width: 1080, height: 1080, name: '小红书方图 1:1' },
  { width: 1080, height: 810, name: '小红书横图 4:3' },
  { width: 1080, height: 1920, name: '抖音封面 9:16' },
  { width: 1920, height: 1080, name: '横版封面 16:9' },
];

// ==================== 数据类型 ====================

export interface DataRow {
  [key: string]: string | number | boolean;
}

export interface DataSource {
  columns: string[];
  rows: DataRow[];
  fileName?: string;
}

// ==================== AI配置类型 ====================

// 前端本地 AI 配置（兼容旧代码）
export interface AIModel {
  id: string;
  name: string;
}

export interface AIProvider {
  name: string;
  label: string;
  baseUrl: string;
  models: string[];
  apiKey?: string;
}

export interface AIConfig {
  providers: AIProvider[];
  activeProvider?: string;
  activeModel?: string;
}

// AI 供应商常量
export const MODEL_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', baseURL: 'https://api.openai.com/v1' },
  { value: 'gemini', label: 'Google Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta' },
  { value: 'qwen', label: '通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'modelscope', label: 'ModelScope', baseURL: 'https://api-inference.modelscope.cn/v1' },
  { value: 'deepseek', label: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1' },
  { value: 'zhipu', label: '智谱AI', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  { value: 'azure', label: 'Azure OpenAI', baseURL: '' },
  { value: 'custom', label: '自定义', baseURL: '' },
] as const;

// ==================== 主题类型 ====================

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
}

// ==================== 生成器类型 ====================

export interface GenerateOptions {
  format: 'png' | 'jpg' | 'webp';
  quality: number; // 0-1
  scale: number; // 导出缩放比例
  fileNamePattern: string; // 如 {{title}}_{{index}}
}

export interface GenerateProgress {
  total: number;
  current: number;
  status: 'idle' | 'generating' | 'completed' | 'error';
  error?: string;
}

export interface GeneratedImage {
  index: number;
  dataUrl: string;
  fileName: string;
}

// ==================== 工具函数 ====================

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function createTextElement(overrides?: Partial<TextElement>): TextElement {
  return {
    id: generateId(),
    type: 'text',
    name: '文本',
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: '双击编辑文字',
    fontSize: 24,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fill: '#000000',
    lineHeight: 1.2,
    ...overrides,
  };
}

export function createImageElement(overrides?: Partial<ImageElement>): ImageElement {
  return {
    id: generateId(),
    type: 'image',
    name: '图片',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src: '',
    fit: 'cover',
    ...overrides,
  };
}

export function createRectElement(overrides?: Partial<RectElement>): RectElement {
  return {
    id: generateId(),
    type: 'rect',
    name: '矩形',
    x: 100,
    y: 100,
    width: 150,
    height: 100,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: '#e5e5e5',
    stroke: '#cccccc',
    strokeWidth: 0,
    cornerRadius: 0,
    ...overrides,
  };
}

// ==================== 小红书卡片生成类型 ====================

// AI解析后的文章结构
export interface ParsedArticle {
  title: string;           // 小红书标题（吸引人）
  introduction: string;    // 简介/hook
  outline: OutlineItem[];  // 大纲
}

// 大纲项（每页内容）
export interface OutlineItem {
  pageNumber: number;      // 页码
  title: string;           // 章节标题
  content: string;         // 该页显示的内容
  imagePrompt: string;     // 背景图生成提示词
}

// 生成的卡片
export interface GeneratedCard {
  pageNumber: number;
  title: string;
  content: string;
  imagePrompt: string;
  backgroundImage: string; // base64 或 URL
  finalImage: string;      // 合成后的最终图片
  status: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
}

// 抓取的文章内容
export interface ScrapedArticle {
  title: string;
  content: string;
  images: string[];
  source: string;
  url: string;
}

// 卡片样式配置
export interface CardStyle {
  width: number;
  height: number;
  backgroundColor: string;
  overlayColor: string;
  overlayOpacity: number;
  titleFontSize: number;
  titleColor: string;
  contentFontSize: number;
  contentColor: string;
  fontFamily: string;
  padding: number;
}
