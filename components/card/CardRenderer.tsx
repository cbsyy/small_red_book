'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RiDragMoveLine, RiEyeLine, RiDownloadLine, RiRefreshLine } from 'react-icons/ri';

/**
 * 卡片内容区块
 */
interface CardSection {
  emoji: string;
  label: string;
  content: string;
}

/**
 * 卡片内容
 */
interface CardContent {
  title: string;
  subtitle?: string;
  sections: CardSection[];
}

/**
 * 文字位置配置
 */
interface TextPosition {
  x: number;  // 百分比 0-100
  y: number;  // 百分比 0-100
}

/**
 * 文字样式配置
 */
interface TextStyle {
  titleColor: string;
  titleSize: number;
  labelColor: string;
  contentColor: string;
  bgColor: string;      // 半透明背景色
  bgOpacity: number;    // 背景透明度 0-1
  bgPadding: number;    // 背景内边距
  bgRadius: number;     // 背景圆角
}

interface CardRendererProps {
  content: CardContent;
  backgroundUrl: string;
  width?: number;
  height?: number;
  editable?: boolean;
  onExport?: (dataUrl: string) => void;
}

const DEFAULT_STYLE: TextStyle = {
  titleColor: '#333333',
  titleSize: 28,
  labelColor: '#FF6B4A',
  contentColor: '#444444',
  bgColor: '#FFFFFF',
  bgOpacity: 0.85,
  bgPadding: 24,
  bgRadius: 16,
};

export default function CardRenderer({
  content,
  backgroundUrl,
  width = 360,
  height = 480,
  editable = true,
  onExport,
}: CardRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<TextPosition>({ x: 50, y: 50 });
  const [style, setStyle] = useState<TextStyle>(DEFAULT_STYLE);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editable) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (position.x / 100) * width,
      y: e.clientY - (position.y / 100) * height,
    });
  }, [editable, position, width, height]);

  // 拖拽移动
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = ((e.clientX - dragStart.x) / width) * 100;
    const newY = ((e.clientY - dragStart.y) / height) * 100;

    setPosition({
      x: Math.max(10, Math.min(90, newX)),
      y: Math.max(10, Math.min(90, newY)),
    });
  }, [isDragging, dragStart, width, height]);

  // 拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 绑定全局鼠标事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 导出图片
  const handleExport = async () => {
    if (!containerRef.current) return;

    try {
      // 使用 html2canvas（需要安装）
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL('image/png');
      onExport?.(dataUrl);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 渲染区域 */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl shadow-lg"
        style={{ width, height }}
      >
        {/* 背景图 */}
        <img
          src={backgroundUrl}
          alt="背景"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
        />

        {/* 文字层（可拖拽） */}
        <div
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
            editable ? 'cursor-move' : ''
          } ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            maxWidth: '85%',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* 半透明背景板 */}
          <div
            className="rounded-2xl"
            style={{
              backgroundColor: style.bgColor,
              opacity: style.bgOpacity,
              padding: style.bgPadding,
              borderRadius: style.bgRadius,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            {/* 标题 */}
            <h2
              className="font-bold text-center mb-2"
              style={{
                color: style.titleColor,
                fontSize: style.titleSize,
                lineHeight: 1.3,
              }}
            >
              {content.title}
            </h2>

            {/* 副标题 */}
            {content.subtitle && (
              <p
                className="text-center mb-4 opacity-80"
                style={{
                  color: style.contentColor,
                  fontSize: style.titleSize * 0.6,
                }}
              >
                {content.subtitle}
              </p>
            )}

            {/* 内容区块 */}
            {content.sections.length > 0 && (
              <div className="space-y-3 mt-4">
                {content.sections.map((section, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{section.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-semibold mr-2"
                        style={{ color: style.labelColor }}
                      >
                        {section.label}
                      </span>
                      <span style={{ color: style.contentColor }}>
                        {section.content}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 拖拽提示 */}
          {editable && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 flex items-center gap-1 bg-white/80 px-2 py-1 rounded">
              <RiDragMoveLine /> 拖拽调整位置
            </div>
          )}
        </div>
      </div>

      {/* 控制面板 */}
      {editable && (
        <div className="flex flex-wrap gap-3 items-center">
          {/* 背景透明度 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">底板透明度</span>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={style.bgOpacity}
              onChange={(e) => setStyle({ ...style, bgOpacity: parseFloat(e.target.value) })}
              className="w-24"
            />
            <span className="text-sm text-gray-500 w-8">{Math.round(style.bgOpacity * 100)}%</span>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            className="ml-auto px-4 py-2 bg-[#FF2442] text-white rounded-lg text-sm font-medium hover:bg-[#E61E3B] flex items-center gap-2"
          >
            <RiDownloadLine /> 导出图片
          </button>
        </div>
      )}
    </div>
  );
}
