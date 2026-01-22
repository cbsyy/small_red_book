'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useCardStore } from '@/store/useCardStore';
import type { GeneratedCard, CardStyle } from '@/types';

interface CardRendererProps {
  card: GeneratedCard;
  style: CardStyle;
  onRender?: (dataUrl: string) => void;
}

// 卡片布局类型
type CardLayout = 'cover' | 'top-text' | 'bottom-text' | 'center-text' | 'split';

// 根据页码选择不同布局
function getLayoutForPage(pageNumber: number, totalPages: number): CardLayout {
  if (pageNumber === 1) return 'cover'; // 封面
  if (pageNumber === totalPages) return 'center-text'; // 最后一页
  const layouts: CardLayout[] = ['top-text', 'bottom-text', 'split'];
  return layouts[(pageNumber - 2) % layouts.length];
}

export default function CardRenderer({ card, style, onRender }: CardRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { cards } = useCardStore();

  const renderCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, padding } = style;
    const layout = getLayoutForPage(card.pageNumber, cards.length || 5);

    // 设置画布尺寸
    canvas.width = width;
    canvas.height = height;

    // 清空画布
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 绘制背景图
    if (card.backgroundImage) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = card.backgroundImage;
        });

        // 计算裁剪以覆盖整个画布
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;

        if (imgRatio > canvasRatio) {
          sw = img.height * canvasRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / canvasRatio;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      } catch (err) {
        console.error('背景图加载失败:', err);
        // 使用渐变背景作为后备
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      // 无背景图时使用渐变
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // 根据布局绘制不同样式
    switch (layout) {
      case 'cover':
        renderCoverLayout(ctx, card, style, width, height);
        break;
      case 'top-text':
        renderTopTextLayout(ctx, card, style, width, height);
        break;
      case 'bottom-text':
        renderBottomTextLayout(ctx, card, style, width, height);
        break;
      case 'center-text':
        renderCenterTextLayout(ctx, card, style, width, height);
        break;
      case 'split':
        renderSplitLayout(ctx, card, style, width, height);
        break;
    }

    // 绘制页码角标
    drawPageBadge(ctx, card.pageNumber, cards.length || 5, width, height, padding);

    // 导出图片
    if (onRender) {
      const dataUrl = canvas.toDataURL('image/png');
      onRender(dataUrl);
    }
  }, [card, style, cards.length, onRender]);

  useEffect(() => {
    renderCard();
  }, [renderCard]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto rounded-lg shadow-lg"
      style={{ maxHeight: '70vh' }}
    />
  );
}

// 封面布局 - 大标题居中
function renderCoverLayout(
  ctx: CanvasRenderingContext2D,
  card: GeneratedCard,
  style: CardStyle,
  width: number,
  height: number
) {
  const { padding, fontFamily } = style;

  // 全屏渐变遮罩 - 从下到上
  const overlay = ctx.createLinearGradient(0, 0, 0, height);
  overlay.addColorStop(0, 'rgba(0,0,0,0.1)');
  overlay.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  // 装饰线条
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, height * 0.35);
  ctx.lineTo(padding + 100, height * 0.35);
  ctx.stroke();

  // 大标题
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 72px ${fontFamily}`;
  ctx.textBaseline = 'top';

  const titleLines = wrapText(ctx, card.title, width - padding * 2);
  let y = height * 0.38;
  titleLines.forEach((line) => {
    // 文字阴影
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fillText(line, padding, y);
    y += 85;
  });
  ctx.shadowColor = 'transparent';

  // 副标题/简介
  y += 30;
  ctx.font = `300 32px ${fontFamily}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const contentLines = wrapText(ctx, card.content, width - padding * 2);
  contentLines.slice(0, 3).forEach((line) => {
    ctx.fillText(line, padding, y);
    y += 45;
  });

  // 底部装饰
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(padding, height - 120, width - padding * 2, 1);

  // 品牌标识区域
  ctx.font = `500 24px ${fontFamily}`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('向右滑动查看更多 →', padding, height - 80);
}

// 顶部文字布局
function renderTopTextLayout(
  ctx: CanvasRenderingContext2D,
  card: GeneratedCard,
  style: CardStyle,
  width: number,
  height: number
) {
  const { padding, fontFamily } = style;

  // 顶部毛玻璃效果区域
  const textAreaHeight = height * 0.45;

  // 渐变遮罩
  const overlay = ctx.createLinearGradient(0, 0, 0, textAreaHeight + 100);
  overlay.addColorStop(0, 'rgba(0,0,0,0.85)');
  overlay.addColorStop(0.7, 'rgba(0,0,0,0.6)');
  overlay.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, textAreaHeight + 100);

  // 章节标签
  drawChapterBadge(ctx, card.pageNumber, padding, padding + 20, fontFamily);

  // 标题
  let y = padding + 90;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 52px ${fontFamily}`;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;

  const titleLines = wrapText(ctx, card.title, width - padding * 2);
  titleLines.forEach((line) => {
    ctx.fillText(line, padding, y);
    y += 65;
  });
  ctx.shadowColor = 'transparent';

  // 分隔线
  y += 15;
  const gradient = ctx.createLinearGradient(padding, y, padding + 150, y);
  gradient.addColorStop(0, 'rgba(255,107,107,1)');
  gradient.addColorStop(1, 'rgba(255,107,107,0)');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(padding + 150, y);
  ctx.stroke();

  // 内容
  y += 35;
  ctx.font = `400 30px ${fontFamily}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const contentLines = wrapText(ctx, card.content, width - padding * 2);
  contentLines.slice(0, 5).forEach((line) => {
    ctx.fillText(line, padding, y);
    y += 45;
  });
}

// 底部文字布局
function renderBottomTextLayout(
  ctx: CanvasRenderingContext2D,
  card: GeneratedCard,
  style: CardStyle,
  width: number,
  height: number
) {
  const { padding, fontFamily } = style;

  // 底部渐变遮罩
  const overlay = ctx.createLinearGradient(0, height * 0.4, 0, height);
  overlay.addColorStop(0, 'rgba(0,0,0,0)');
  overlay.addColorStop(0.3, 'rgba(0,0,0,0.5)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  // 内容卡片背景
  const cardY = height * 0.55;
  const cardHeight = height - cardY - padding;

  // 毛玻璃卡片效果
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRect(ctx, padding - 10, cardY - 20, width - padding * 2 + 20, cardHeight + 30, 20);
  ctx.fill();

  // 章节标签
  drawChapterBadge(ctx, card.pageNumber, padding, cardY, fontFamily);

  // 标题
  let y = cardY + 60;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 48px ${fontFamily}`;

  const titleLines = wrapText(ctx, card.title, width - padding * 2);
  titleLines.forEach((line) => {
    ctx.fillText(line, padding, y);
    y += 60;
  });

  // 内容
  y += 20;
  ctx.font = `400 28px ${fontFamily}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const contentLines = wrapText(ctx, card.content, width - padding * 2);
  const maxLines = Math.floor((height - y - padding - 30) / 42);
  contentLines.slice(0, maxLines).forEach((line) => {
    ctx.fillText(line, padding, y);
    y += 42;
  });
}

// 居中文字布局 - 适合总结页
function renderCenterTextLayout(
  ctx: CanvasRenderingContext2D,
  card: GeneratedCard,
  style: CardStyle,
  width: number,
  height: number
) {
  const { padding, fontFamily } = style;

  // 全屏渐变遮罩
  const overlay = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) / 1.5
  );
  overlay.addColorStop(0, 'rgba(0,0,0,0.5)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  // 装饰圆环
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 250, 0, Math.PI * 2);
  ctx.stroke();

  // 计算内容总高度
  ctx.font = `bold 56px ${fontFamily}`;
  const titleLines = wrapText(ctx, card.title, width - padding * 3);
  ctx.font = `400 30px ${fontFamily}`;
  const contentLines = wrapText(ctx, card.content, width - padding * 3);

  const titleHeight = titleLines.length * 70;
  const contentHeight = Math.min(contentLines.length, 6) * 46;
  const totalHeight = titleHeight + contentHeight + 60;

  let y = (height - totalHeight) / 2;

  // 标题
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 56px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;

  titleLines.forEach((line) => {
    ctx.fillText(line, width / 2, y);
    y += 70;
  });
  ctx.shadowColor = 'transparent';

  // 装饰线
  y += 10;
  const lineGradient = ctx.createLinearGradient(width / 2 - 80, y, width / 2 + 80, y);
  lineGradient.addColorStop(0, 'rgba(255,107,107,0)');
  lineGradient.addColorStop(0.5, 'rgba(255,107,107,1)');
  lineGradient.addColorStop(1, 'rgba(255,107,107,0)');
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 80, y);
  ctx.lineTo(width / 2 + 80, y);
  ctx.stroke();
  y += 40;

  // 内容
  ctx.font = `400 30px ${fontFamily}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  contentLines.slice(0, 6).forEach((line) => {
    ctx.fillText(line, width / 2, y);
    y += 46;
  });

  ctx.textAlign = 'left';
}

// 分割布局 - 左右或上下分割
function renderSplitLayout(
  ctx: CanvasRenderingContext2D,
  card: GeneratedCard,
  style: CardStyle,
  width: number,
  height: number
) {
  const { padding, fontFamily } = style;

  // 右侧文字区域背景
  const textAreaX = width * 0.05;
  const textAreaWidth = width * 0.9;
  const textAreaY = height * 0.6;
  const textAreaHeight = height * 0.38;

  // 文字区域毛玻璃背景
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, textAreaX, textAreaY, textAreaWidth, textAreaHeight, 24);
  ctx.fill();

  // 卡片阴影
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, textAreaX, textAreaY, textAreaWidth, textAreaHeight, 24);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // 顶部装饰条
  const accentGradient = ctx.createLinearGradient(textAreaX, textAreaY, textAreaX + 120, textAreaY);
  accentGradient.addColorStop(0, '#FF6B6B');
  accentGradient.addColorStop(1, '#FF8E53');
  ctx.fillStyle = accentGradient;
  roundRect(ctx, textAreaX, textAreaY, 120, 6, 3);
  ctx.fill();

  // 章节标签
  ctx.fillStyle = '#FF6B6B';
  ctx.font = `600 20px ${fontFamily}`;
  ctx.fillText(`第 ${card.pageNumber} 页`, textAreaX + 24, textAreaY + 45);

  // 标题
  let y = textAreaY + 85;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `bold 40px ${fontFamily}`;

  const titleLines = wrapText(ctx, card.title, textAreaWidth - 48);
  titleLines.slice(0, 2).forEach((line) => {
    ctx.fillText(line, textAreaX + 24, y);
    y += 52;
  });

  // 内容
  y += 10;
  ctx.font = `400 26px ${fontFamily}`;
  ctx.fillStyle = '#4a4a4a';
  const contentLines = wrapText(ctx, card.content, textAreaWidth - 48);
  const maxLines = Math.floor((textAreaY + textAreaHeight - y - 30) / 38);
  contentLines.slice(0, maxLines).forEach((line) => {
    ctx.fillText(line, textAreaX + 24, y);
    y += 38;
  });
}

// 绘制章节标签
function drawChapterBadge(
  ctx: CanvasRenderingContext2D,
  pageNumber: number,
  x: number,
  y: number,
  fontFamily: string
) {
  // 标签背景
  const gradient = ctx.createLinearGradient(x, y, x + 100, y);
  gradient.addColorStop(0, '#FF6B6B');
  gradient.addColorStop(1, '#FF8E53');
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, 90, 32, 16);
  ctx.fill();

  // 标签文字
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 18px ${fontFamily}`;
  ctx.fillText(`第 ${pageNumber} 页`, x + 15, y + 22);
}

// 绘制页码角标
function drawPageBadge(
  ctx: CanvasRenderingContext2D,
  pageNumber: number,
  totalPages: number,
  width: number,
  height: number,
  padding: number
) {
  const badgeSize = 50;
  const x = width - padding - badgeSize;
  const y = height - padding - badgeSize;

  // 圆形背景
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(x + badgeSize / 2, y + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // 页码
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pageNumber}/${totalPages}`, x + badgeSize / 2, y + badgeSize / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// 圆角矩形辅助函数
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 文字换行处理
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split('');
    let currentLine = '';

    words.forEach((char) => {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines;
}
