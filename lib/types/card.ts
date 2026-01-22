/**
 * 小红书知识卡片 - 核心类型定义
 * 采用全 JSON 化设计，确保稳定性和可编辑性
 */

// ==================== 文本内容结构 ====================

/**
 * 卡片内容区块（emoji + 标签 + 内容）
 */
export interface CardSection {
  emoji: string;
  label: string;
  content: string;
}

/**
 * 卡片布局类型
 */
export type CardLayout =
  | 'vertical-list'    // 垂直列表（最常用）
  | 'two-column'       // 两栏布局
  | 'centered'         // 居中布局（适合封面）
  | 'timeline'         // 时间线布局
  | 'comparison';      // 对比布局

/**
 * 文本模型输出的卡片内容
 * 结构简单，AI 自由发挥
 */
export interface CardContent {
  // 基础内容
  title: string;
  subtitle?: string;
  sections: CardSection[];
  layout: CardLayout;

  // 可选扩展
  formula?: string;
  note?: string;

  // AI 自由输出的样式建议（可选，格式不限）
  style?: {
    colorTheme?: string;          // eg: "暖色系", "科技蓝", "自然绿"
    mood?: string;                // eg: "专业", "活泼", "温暖"
    backgroundHint?: string;      // eg: "建议使用渐变背景配合叶子装饰"
    [key: string]: any;           // 允许 AI 自由扩展
  };
}

// ==================== 背景板管理 ====================

/**
 * 背景板来源类型
 */
export type BackgroundSource =
  | 'upload'      // 用户上传
  | 'prompt'      // 用户输入 prompt 生成
  | 'library'     // 从历史库选择
  | 'preset';     // 系统预设模板

/**
 * 背景板数据（可存储到数据库）
 */
export interface BackgroundImage {
  id: string;
  name: string;
  description?: string;

  // 来源信息
  source: BackgroundSource;
  prompt?: string;          // 如果是 prompt 生成的，记录原始 prompt

  // 图片数据
  imageUrl: string;         // 图片 URL（OSS 或本地）
  thumbnailUrl?: string;    // 缩略图

  // 元数据
  width: number;
  height: number;
  aspectRatio: string;
  fileSize?: number;

  // 分类标签
  tags: string[];           // eg: ["暖色", "叶子", "极简"]
  category?: string;        // eg: "小红书风格", "极简", "自然"

  // 使用统计
  useCount: number;
  isFavorite: boolean;

  // 时间
  createdAt: Date;
  updatedAt: Date;

  // 是否系统预设
  isPreset: boolean;

  // 创建者（如果支持多用户）
  userId?: string;
}

/**
 * 背景板库查询条件
 */
export interface BackgroundQueryParams {
  source?: BackgroundSource;
  category?: string;
  tags?: string[];
  isFavorite?: boolean;
  search?: string;          // 搜索名称/描述
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'useCount' | 'name';
  orderDir?: 'asc' | 'desc';
}

/**
 * 渐变类型
 */
export type GradientType = 'linear' | 'radial';

/**
 * 装饰元素类型
 */
export type DecorationType =
  | 'leaf'           // 叶子
  | 'dots'           // 圆点
  | 'geometric'      // 几何图形
  | 'wave'           // 波浪
  | 'blob'           // 不规则形状
  | 'grid'           // 网格
  | 'none';          // 无装饰

/**
 * 装饰元素配置
 */
export interface DecorationConfig {
  type: DecorationType;
  position: 'corners' | 'top' | 'bottom' | 'scattered' | 'border';
  opacity: number;  // 0-1
  color?: string;
}

/**
 * 背景样式配置（JSON 格式，可存储为模板）
 */
export interface BackgroundStyle {
  // 基础背景
  type: 'solid' | 'gradient' | 'image';
  colors: string[];  // 单色或渐变色
  gradientType?: GradientType;
  gradientAngle?: number;  // 渐变角度

  // 装饰元素
  decorations: DecorationConfig[];

  // 边框
  border?: {
    type: 'none' | 'solid' | 'rounded' | 'dashed';
    radius?: number;
    color?: string;
    width?: number;
  };

  // 尺寸
  aspectRatio: '3:4' | '1:1' | '4:3' | '9:16';
  width: number;
  height: number;
}

/**
 * 背景模板（可存储到数据库）
 */
export interface BackgroundTemplate {
  id: string;
  name: string;
  description?: string;
  style: BackgroundStyle;
  previewUrl?: string;  // 预览图 URL
  isBuiltin: boolean;   // 是否内置模板
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 文生图 Prompt JSON ====================

/**
 * 背景风格主题
 */
export type BackgroundTheme =
  | 'xiaohongshu-warm'      // 小红书暖色系（奶油、珊瑚）
  | 'xiaohongshu-cool'      // 小红书冷色系（薄荷、天蓝）
  | 'minimalist-white'      // 极简白
  | 'minimalist-dark'       // 极简暗色
  | 'gradient-sunset'       // 日落渐变
  | 'gradient-ocean'        // 海洋渐变
  | 'nature-leaf'           // 自然叶子
  | 'nature-floral'         // 花卉
  | 'geometric-modern'      // 现代几何
  | 'abstract-fluid'        // 抽象流体
  | 'tech-grid'             // 科技网格
  | 'vintage-paper'         // 复古纸张
  | 'custom';               // 自定义

/**
 * 装饰图案类型
 */
export type PatternType =
  | 'leaves'                // 叶子装饰
  | 'flowers'               // 花朵
  | 'dots'                  // 圆点
  | 'circles'               // 圆圈
  | 'geometric-shapes'      // 几何图形
  | 'waves'                 // 波浪
  | 'lines'                 // 线条
  | 'blobs'                 // 不规则形状
  | 'stars'                 // 星星
  | 'sparkles'              // 闪光
  | 'clouds'                // 云朵
  | 'abstract'              // 抽象图案
  | 'grid'                  // 网格
  | 'none';                 // 无图案

/**
 * 文生图 Prompt JSON 结构
 * 描述要生成的背景板风格、图案、配色
 * 最终转换为 prompt 字符串发送给文生图模型
 */
export interface ImagePromptJSON {
  // 主题风格
  theme: BackgroundTheme;

  // 配色方案
  colors: {
    primary: string;      // 主色 eg: "coral orange", "#FF6B4A"
    secondary: string;    // 辅色 eg: "teal", "#4ECDC4"
    background: string;   // 背景色 eg: "cream", "#FFF8F0"
    accent?: string;      // 强调色
  };

  // 渐变设置
  gradient?: {
    type: 'linear' | 'radial';
    direction?: 'top-bottom' | 'left-right' | 'diagonal' | 'center-out';
    colors: string[];     // 渐变色列表
  };

  // 装饰图案（可多个）
  patterns: {
    type: PatternType;
    position: 'corners' | 'top' | 'bottom' | 'left' | 'right' | 'scattered' | 'border' | 'center';
    style: 'subtle' | 'moderate' | 'prominent';  // 明显程度
    color?: string;
  }[];

  // 整体氛围
  mood: 'warm' | 'cool' | 'neutral' | 'vibrant' | 'soft' | 'bold';

  // 质感
  texture?: 'smooth' | 'paper' | 'fabric' | 'glossy' | 'matte' | 'grain';

  // 图片规格
  aspectRatio: '3:4' | '1:1' | '4:3' | '9:16';
  quality: 'standard' | 'high' | '4k';

  // 额外描述（自由发挥）
  additionalDescription?: string;

  // 强制无文字
  noText: true;
}

/**
 * Prompt JSON 转换为 prompt 字符串的示例输出：
 *
 * "xiaohongshu knowledge card background, cream to light peach gradient,
 *  soft coral orange and teal accents, decorative leaves in corners,
 *  subtle geometric shapes scattered, warm cozy mood,
 *  smooth texture, minimalist clean design,
 *  no text no words no letters, high quality 4K,
 *  aspect ratio 3:4"
 */

// ==================== 完整卡片数据 ====================

/**
 * 完整的卡片数据
 */
export interface CardData {
  id: string;
  pageNumber: number;

  // 内容（文本模型生成）
  content: CardContent;

  // 背景板
  background: {
    source: BackgroundSource;
    imageId?: string;         // 库中选择时的 ID
    imageUrl: string;         // 图片 URL
    prompt?: string;          // 生成时的 prompt
  };

  // 状态
  status: 'draft' | 'previewing' | 'generating-bg' | 'completed' | 'error';
  error?: string;
}

// ==================== API 请求/响应类型 ====================

/**
 * 文本提取 API 请求
 */
export interface ExtractContentRequest {
  text: string;
  title?: string;
  cardCount?: number;  // 希望生成几张卡片
}

/**
 * 文本提取 API 响应
 */
export interface ExtractContentResponse {
  success: boolean;
  data?: {
    cards: CardContent[];
    model: string;
  };
  error?: string;
}

/**
 * 背景生成 API 请求
 */
export interface GenerateBackgroundRequest {
  promptJSON: ImagePromptJSON;
  // 或使用模板
  templateId?: string;
}

/**
 * 背景生成 API 响应
 */
export interface GenerateBackgroundResponse {
  success: boolean;
  data?: {
    imageUrl: string;
    style: BackgroundStyle;
  };
  error?: string;
}

// ==================== 工具函数类型 ====================

/**
 * JSON → Prompt 字符串转换器
 */
export type PromptConverter = (json: ImagePromptJSON) => string;

/**
 * 卡片渲染选项
 */
export interface RenderOptions {
  quality: 'preview' | 'export';
  format: 'png' | 'jpeg' | 'webp';
  scale: number;  // 导出倍率
}
