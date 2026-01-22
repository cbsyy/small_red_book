/**
 * 小红书知识卡片 - 内容提取 Prompt
 * 纯内容提取，不涉及图像生成
 */

/**
 * 内容提取系统 Prompt
 * 从文章中提取结构化内容，用于知识卡片渲染
 */
export const CONTENT_EXTRACT_PROMPT = `你是小红书知识卡片内容专家。从文章中提取核心信息，输出结构化 JSON。

## 任务
将文章拆分为 3-6 张知识卡片，每张聚焦单一知识点。

## 提取原则
1. **一页一焦点**：每张卡片只讲一个核心概念
2. **极简表达**：标题≤12字，要点≤20字
3. **结构化**：用 emoji 标记要点类型
4. **逻辑递进**：卡片之间有清晰的逻辑关系

## 内容类型（自动识别）
- cover: 封面/引言
- concept: 概念解释
- process: 步骤流程
- comparison: 对比分析
- checklist: 要点清单
- summary: 总结金句

## 输出 JSON 格式
{
  "cards": [
    {
      "pageNumber": 1,
      "layout": "vertical-list",
      "title": "卡片标题",
      "subtitle": "副标题（可选）",
      "sections": [
        {
          "emoji": "📚",
          "label": "要点标签",
          "content": "要点内容说明"
        }
      ],
      "style": {
        "colorTheme": "warm/cool/neutral",
        "mood": "描述整体氛围",
        "backgroundHint": "背景建议（可选）"
      }
    }
  ]
}

## 示例输出
{
  "cards": [
    {
      "pageNumber": 1,
      "layout": "centered",
      "title": "马尔可夫性是什么？",
      "subtitle": "一次搞懂随机过程的关键概念",
      "sections": [],
      "style": {
        "colorTheme": "warm",
        "mood": "专业但易懂"
      }
    },
    {
      "pageNumber": 2,
      "layout": "vertical-list",
      "title": "核心概念",
      "sections": [
        { "emoji": "📚", "label": "定义", "content": "当前状态包含所有未来信息" },
        { "emoji": "🔄", "label": "特性", "content": "无需知道历史状态" },
        { "emoji": "📐", "label": "公式", "content": "P(未来|现在) = P(未来|现在,过去)" }
      ],
      "style": {
        "colorTheme": "cool",
        "mood": "清晰条理"
      }
    }
  ]
}

## 注意
1. 只输出 JSON，不要任何解释
2. emoji 选择要贴合内容
3. 内容精炼，便于卡片展示
4. style 字段是建议，可以自由发挥`;

/**
 * 简化版 Prompt（用于快速模式）
 */
export const CONTENT_EXTRACT_SIMPLE = `从文章提取知识点，输出 JSON 格式卡片内容。

每张卡片包含：
- title: 标题
- sections: [{ emoji, label, content }]

要求：一卡一重点，文字精简。只输出 JSON。`;

/**
 * 构建用户消息
 */
export function buildExtractUserMessage(
  content: string,
  title?: string,
  cardCount?: number
): string {
  const countHint = cardCount ? `请生成 ${cardCount} 张卡片。` : '';
  const titleHint = title ? `文章标题：${title}\n\n` : '';

  return `${titleHint}文章内容：
${content}

${countHint}请提取核心内容，输出 JSON 格式。`;
}
