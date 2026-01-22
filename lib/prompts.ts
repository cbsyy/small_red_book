// 小红书知识卡片生成 Prompt 配置
// 支持 AI 直接生成带中文文字的图文卡片

/**
 * 知识卡片风格基础约束
 */
export const INFOGRAPHIC_STYLE_SUFFIX = `
Style: xiaohongshu knowledge infographic card,
clean minimalist design, soft pastel color palette,
cream/beige background with coral orange and teal accents,
rounded corners, cute flat icons,
professional information visualization,
subtle decorative borders and patterns,
high quality 4K render,
aspect ratio 3:4 vertical`.replace(/\n/g, ' ').trim();

/**
 * 负面提示词（不包含 text 相关，因为我们需要文字）
 */
export const NEGATIVE_PROMPT = `watermark, logo, signature,
blurry, low quality, ugly, distorted, photorealistic photo,
human face, portrait, complex background, cluttered,
messy text, unreadable text, broken characters`.replace(/\n/g, ' ').trim();

/**
 * 内容类型到视觉布局的映射
 */
export const CONTENT_TYPE_VISUALS = {
  process: {
    layout: 'vertical flowchart with 3-5 connected nodes and arrows',
    elements: 'numbered circles, directional arrows, step indicators',
    example: 'flowchart diagram showing sequential steps from top to bottom',
  },
  comparison: {
    layout: 'split layout with VS divider in center',
    elements: 'two distinct panels, comparison icons, balance scale',
    example: 'side by side comparison chart with contrasting colors',
  },
  concept: {
    layout: 'central element with radiating branches',
    elements: 'mind map structure, connecting lines, satellite nodes',
    example: 'radial diagram with core concept in center and related ideas around',
  },
  checklist: {
    layout: 'vertical list with icon markers',
    elements: 'checkmark icons, bullet points, numbered items',
    example: 'organized list layout with decorative icons for each point',
  },
  timeline: {
    layout: 'horizontal or vertical timeline with milestones',
    elements: 'timeline bar, milestone dots, date markers',
    example: 'chronological timeline showing progression of events',
  },
  hierarchy: {
    layout: 'tree diagram or pyramid structure',
    elements: 'nested levels, parent-child connections, layers',
    example: 'hierarchical tree showing relationships and levels',
  },
  summary: {
    layout: 'centered highlight with decorative frame',
    elements: 'quote marks, highlight box, decorative corners',
    example: 'featured text area with elegant border decoration',
  },
};

/**
 * 主Prompt：分析文章并生成带中文文字的图文卡片
 */
export const CARD_ANALYSIS_PROMPT = `你是小红书知识卡片设计专家。分析文章内容，为每页生成精准的图文卡片数据。

## 核心任务
1. 将文章拆分为 3-6 页知识卡片
2. 每页聚焦**单一知识点**，内容精炼
3. 为每页生成**带中文文字的图像Prompt**，AI 绘图模型会直接在图片上渲染文字

## 内容提取原则
- 一页一焦点：每页只讲一个核心概念
- 极简表达：标题≤12字，要点≤6字/条
- 结构化：用emoji标记要点，便于视觉扫描
- 逻辑递进：页与页之间有清晰的逻辑关系

## 页面类型识别
- **cover**: 封面页，吸引眼球的标题
- **process**: 有步骤、流程、顺序
- **comparison**: 有对比、优缺点、A vs B
- **concept**: 解释概念、定义、原理
- **checklist**: 技巧清单、要点罗列
- **timeline**: 时间顺序、发展历程
- **summary**: 总结、结论、金句

## 🔴 图像Prompt生成规则（重要！）

### 必须包含中文文字指令
imagePrompt 中必须用 **Chinese text (xxx)** 格式指定要在图片上显示的中文文字：
- 标题文字：Chinese title text (标题内容)
- 要点文字：Chinese bullet text (要点1), (要点2), (要点3)
- 数字/序号：number text (1), (2), (3) 或 (第一步), (第二步)

⚠️ **注意**：中文内容用小括号 () 包裹，不要用引号！

### Prompt 结构模板
\`\`\`
xiaohongshu knowledge infographic [类型],
[布局描述],
Chinese title text (标题),
Chinese subtitle text (副标题),
Chinese bullet points (要点1), (要点2), (要点3),
[视觉元素描述],
[配色方案],
clean readable Chinese typography, modern sans-serif font,
cream background, coral orange and teal accents,
high quality 4K render, aspect ratio 3:4
\`\`\`

### 配色方案
- 背景：cream, beige, light warm tones
- 主色：coral orange (#FF6B4A), teal (#4ECDC4)
- 文字：dark gray for readability

## 输出JSON格式
{
  "cards": [
    {
      "pageNumber": 1,
      "pageType": "cover",
      "title": "标题（用于显示和 prompt）",
      "subtitle": "副标题",
      "points": [
        {"emoji": "💡", "label": "要点1", "detail": "简短说明"}
      ],
      "imagePrompt": "包含中文文字指令的英文 Prompt",
      "imagePromptExplain": "中文解释：这张图会显示什么内容"
    }
  ]
}

## 示例输出
{
  "cards": [
    {
      "pageNumber": 1,
      "pageType": "cover",
      "title": "马尔可夫性是什么？",
      "subtitle": "一次搞懂随机过程的关键概念",
      "points": [],
      "imagePrompt": "xiaohongshu knowledge infographic cover page, centered layout with decorative frame, Chinese title text (马尔可夫性是什么？) in large bold font at center, Chinese subtitle text (一次搞懂随机过程的关键概念) below title, abstract state transition diagram with 3 connected circles as background decoration, soft gradient from cream to light peach, coral orange accent color, clean readable Chinese typography, modern design, high quality 4K render, aspect ratio 3:4",
      "imagePromptExplain": "封面图：大标题'马尔可夫性是什么？'居中，副标题在下方，背景是抽象的状态转移装饰图"
    },
    {
      "pageNumber": 2,
      "pageType": "concept",
      "title": "核心定义",
      "subtitle": "",
      "points": [
        {"emoji": "🎯", "label": "当前状态", "detail": "包含所有未来信息"},
        {"emoji": "❌", "label": "无需历史", "detail": "过去状态可忽略"},
        {"emoji": "📐", "label": "数学表达", "detail": "条件概率简化"}
      ],
      "imagePrompt": "xiaohongshu knowledge infographic concept card, vertical list layout, Chinese title text (核心定义) at top, Chinese bullet points with emojis (🎯 当前状态), (❌ 无需历史), (📐 数学表达) arranged vertically, each bullet with small detail text, central glowing circle icon representing current state, cream background with teal and coral accents, clean readable Chinese typography, organized modern design, high quality 4K render, aspect ratio 3:4",
      "imagePromptExplain": "概念卡：顶部标题'核心定义'，下方是3个带emoji的要点列表，配有状态图标装饰"
    },
    {
      "pageNumber": 3,
      "pageType": "process",
      "title": "理解步骤",
      "subtitle": "",
      "points": [
        {"emoji": "1️⃣", "label": "观察当前", "detail": ""},
        {"emoji": "2️⃣", "label": "预测未来", "detail": ""},
        {"emoji": "3️⃣", "label": "忽略过去", "detail": ""}
      ],
      "imagePrompt": "xiaohongshu knowledge infographic process flowchart, vertical flow layout, Chinese title text (理解步骤) at top, three connected nodes with Chinese text (1️⃣ 观察当前), (2️⃣ 预测未来), (3️⃣ 忽略过去), curved arrows connecting nodes from top to bottom, cream background, coral orange nodes with teal arrows, clean readable Chinese typography, modern flat design, high quality 4K render, aspect ratio 3:4",
      "imagePromptExplain": "流程图：顶部标题'理解步骤'，3个步骤节点从上到下连接，每个节点显示中文步骤名"
    }
  ]
}

## ⚠️ 必须遵守
1. **必须输出 JSON**：不要任何解释，只输出 JSON
2. **必须包含中文文字指令**：imagePrompt 中必须用 Chinese text (xxx) 格式包含要显示的中文，用小括号不要用引号
3. **文字必须清晰可读**：添加 "clean readable Chinese typography" 确保文字清晰
4. **必须包含 imagePromptExplain**：中文解释帮助用户理解
5. **禁止省略字段**：每张卡片都必须有完整的 imagePrompt`.trim();

/**
 * 根据页面类型生成基础prompt模板
 */
export function getBasePromptForType(pageType: string): string {
  const templates: Record<string, string> = {
    cover: `xiaohongshu knowledge infographic cover page, centered layout with decorative frame,
Chinese title text ([TITLE]) in large bold font at center,
soft gradient background, coral orange and teal accents, elegant minimalist style`,

    process: `xiaohongshu knowledge infographic flowchart, vertical flow layout,
Chinese title text ([TITLE]) at top,
connected nodes with Chinese step text, curved directional arrows,
cream background, coral and teal accents, clean flat design`,

    comparison: `xiaohongshu knowledge infographic comparison chart, split layout,
Chinese title text ([TITLE]) at top,
two panels with Chinese labels, VS divider in center,
soft pastel colors, coral vs teal color coding`,

    concept: `xiaohongshu knowledge infographic mind map, radial layout,
Chinese title text ([TITLE]) at center,
radiating branches with Chinese labels,
cream background, coral orange highlights`,

    checklist: `xiaohongshu knowledge infographic checklist, vertical list layout,
Chinese title text ([TITLE]) at top,
bullet points with Chinese text and emoji markers,
cream background with coral accents, clean modern design`,

    timeline: `xiaohongshu knowledge infographic timeline, horizontal layout,
Chinese title text ([TITLE]) at top,
timeline bar with Chinese milestone labels,
soft gradient background, coral and teal nodes`,

    summary: `xiaohongshu knowledge infographic summary card, centered layout,
Chinese title text ([TITLE]) with decorative frame,
elegant border, gradient background, featured content area`,
  };

  return (templates[pageType] || templates.concept).replace(/\n/g, ' ').trim();
}

/**
 * 增强用户编辑的prompt（不添加 no text）
 */
export function enhanceUserPrompt(userPrompt: string): string {
  const hasStyle = userPrompt.toLowerCase().includes('xiaohongshu') ||
    userPrompt.toLowerCase().includes('infographic');

  let enhanced = userPrompt.trim();

  // 添加风格前缀（如果没有）
  if (!hasStyle) {
    enhanced = `xiaohongshu knowledge infographic style, ${enhanced}`;
  }

  // 确保有中文排版说明
  if (!enhanced.toLowerCase().includes('chinese typography')) {
    enhanced = `${enhanced}, clean readable Chinese typography`;
  }

  // 添加质量后缀
  if (!enhanced.includes('4K') && !enhanced.includes('high quality')) {
    enhanced = `${enhanced}, high quality 4K render`;
  }

  return enhanced;
}

/**
 * 生成完整的图像生成请求
 */
export function buildImageGenerationRequest(
  prompt: string,
  options?: {
    size?: string;
    negativePrompt?: string;
  }
) {
  return {
    prompt: enhanceUserPrompt(prompt),
    negative_prompt: options?.negativePrompt || NEGATIVE_PROMPT,
    size: options?.size || '1024x1024',
  };
}

// ==================== 兼容旧代码 ====================

export const DEFAULT_TEXT_PROMPT = CARD_ANALYSIS_PROMPT;

export const DEFAULT_IMAGE_PROMPT = `Generate xiaohongshu knowledge infographic style image with Chinese text.
${INFOGRAPHIC_STYLE_SUFFIX}
Clean readable Chinese typography.`.trim();

export const QUICK_MODE_SYSTEM_PROMPT = CARD_ANALYSIS_PROMPT;

export function enhancePromptWithStyle(contentPrompt: string, pageNumber?: number): string {
  return enhanceUserPrompt(contentPrompt);
}

export function createQuickPromptsUserMessage(
  content: string,
  title: string,
  count: number
): string {
  const truncatedContent = content.length > 3000
    ? content.substring(0, 3000) + '...(已截断)'
    : content;

  return `请分析以下文章，生成 ${count} 张小红书知识卡片。

文章标题：${title || '无标题'}

文章内容：
${truncatedContent}

按照系统提示的JSON格式输出，每张卡片的 imagePrompt 必须包含要显示的中文文字。`;
}

export const XIAOHONGSHU_INFOGRAPHIC_STYLE = DEFAULT_IMAGE_PROMPT;
