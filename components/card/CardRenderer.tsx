'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  RiDragMoveLine,
  RiDownloadLine,
  RiAlignLeft,
  RiAlignCenter,
  RiAlignRight,
  RiFocusLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiAddLine,
  RiSubtractLine,
} from 'react-icons/ri';

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
 * 文字对齐方式
 */
type TextAlign = 'left' | 'center' | 'right';

/**
 * 文字样式配置
 */
interface TextStyle {
  // 颜色
  titleColor: string;
  labelColor: string;
  contentColor: string;
  // 字号
  titleSize: number;
  labelSize: number;
  contentSize: number;
  // 背景
  bgColor: string;
  bgOpacity: number;
  bgPadding: number;
  bgRadius: number;
  // 间距
  lineHeight: number;
  sectionGap: number;
  // 对齐
  textAlign: TextAlign;
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
  labelColor: '#FF6B4A',
  contentColor: '#444444',
  titleSize: 28,
  labelSize: 16,
  contentSize: 14,
  bgColor: '#FFFFFF',
  bgOpacity: 0.88,
  bgPadding: 24,
  bgRadius: 16,
  lineHeight: 1.5,
  sectionGap: 12,
  textAlign: 'left',
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
  const [showControls, setShowControls] = useState(true);

  // 拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
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
      x: Math.max(5, Math.min(95, newX)),
      y: Math.max(5, Math.min(95, newY)),
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

  // 一键居中
  const handleCenterAlign = () => {
    setPosition({ x: 50, y: 50 });
  };

  // 微调位置
  const adjustPosition = (dx: number, dy: number) => {
    setPosition(prev => ({
      x: Math.max(5, Math.min(95, prev.x + dx)),
      y: Math.max(5, Math.min(95, prev.y + dy)),
    }));
  };

  // 调整字号
  const adjustFontSize = (field: 'titleSize' | 'labelSize' | 'contentSize', delta: number) => {
    setStyle(prev => ({
      ...prev,
      [field]: Math.max(12, Math.min(48, prev[field] + delta)),
    }));
  };

  // 导出图片
  const handleExport = async () => {
    if (!containerRef.current) return;

    // 临时隐藏控制元素
    setShowControls(false);
    await new Promise(r => setTimeout(r, 100));

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      onExport?.(dataUrl);

      // 自动下载
      const link = document.createElement('a');
      link.download = `card-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setShowControls(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 渲染区域 */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl shadow-lg select-none"
        style={{ width, height }}
      >
        {/* 背景图 */}
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            alt="背景"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-100" />
        )}

        {/* 文字层（可拖拽） */}
        <div
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
            editable ? 'cursor-move' : ''
          } ${isDragging ? 'cursor-grabbing scale-[1.02]' : ''} transition-transform`}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            maxWidth: '90%',
            minWidth: '70%',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* 半透明背景板 */}
          <div
            style={{
              backgroundColor: style.bgColor,
              opacity: style.bgOpacity,
              padding: style.bgPadding,
              borderRadius: style.bgRadius,
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              textAlign: style.textAlign,
            }}
          >
            {/* 标题 */}
            <h2
              className="font-bold mb-1"
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
                className="mb-4 opacity-70"
                style={{
                  color: style.contentColor,
                  fontSize: style.titleSize * 0.55,
                }}
              >
                {content.subtitle}
              </p>
            )}

            {/* 内容区块 */}
            {content.sections.length > 0 && (
              <div
                className="mt-4"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: style.sectionGap,
                }}
              >
                {content.sections.map((section, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2"
                    style={{
                      textAlign: 'left',  // 内容始终左对齐
                      lineHeight: style.lineHeight,
                    }}
                  >
                    <span className="flex-shrink-0" style={{ fontSize: style.labelSize + 2 }}>
                      {section.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-semibold"
                        style={{
                          color: style.labelColor,
                          fontSize: style.labelSize,
                        }}
                      >
                        {section.label}：
                      </span>
                      <span
                        style={{
                          color: style.contentColor,
                          fontSize: style.contentSize,
                        }}
                      >
                        {section.content}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 拖拽提示（导出时隐藏） */}
          {editable && showControls && (
            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-white/90 bg-black/50 px-2 py-1 rounded flex items-center gap-1">
              <RiDragMoveLine /> 拖拽调整
            </div>
          )}
        </div>
      </div>

      {/* 控制面板 */}
      {editable && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          {/* 第一行：位置控制 + 一键居中 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 w-12">位置</span>
              <button
                onClick={() => adjustPosition(0, -2)}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="上移"
              >
                <RiArrowUpLine />
              </button>
              <button
                onClick={() => adjustPosition(0, 2)}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="下移"
              >
                <RiArrowDownLine />
              </button>
              <button
                onClick={() => adjustPosition(-2, 0)}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="左移"
              >
                <RiArrowLeftLine />
              </button>
              <button
                onClick={() => adjustPosition(2, 0)}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="右移"
              >
                <RiArrowRightLine />
              </button>
            </div>

            <button
              onClick={handleCenterAlign}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
            >
              <RiFocusLine /> 一键居中
            </button>

            {/* 对齐方式 */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-gray-500 mr-1">对齐</span>
              {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                <button
                  key={align}
                  onClick={() => setStyle({ ...style, textAlign: align })}
                  className={`p-1.5 rounded ${
                    style.textAlign === align
                      ? 'bg-[#FF2442] text-white'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  {align === 'left' && <RiAlignLeft />}
                  {align === 'center' && <RiAlignCenter />}
                  {align === 'right' && <RiAlignRight />}
                </button>
              ))}
            </div>
          </div>

          {/* 第二行：字号控制 */}
          <div className="flex items-center gap-6">
            {/* 标题字号 */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 w-12">标题</span>
              <button
                onClick={() => adjustFontSize('titleSize', -2)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <RiSubtractLine className="text-sm" />
              </button>
              <span className="text-xs w-6 text-center">{style.titleSize}</span>
              <button
                onClick={() => adjustFontSize('titleSize', 2)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <RiAddLine className="text-sm" />
              </button>
            </div>

            {/* 标签字号 */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 w-12">标签</span>
              <button
                onClick={() => adjustFontSize('labelSize', -1)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <RiSubtractLine className="text-sm" />
              </button>
              <span className="text-xs w-6 text-center">{style.labelSize}</span>
              <button
                onClick={() => adjustFontSize('labelSize', 1)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <RiAddLine className="text-sm" />
              </button>
            </div>

            {/* 正文字号 */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 w-12">正文</span>
              <button
                onClick={() => adjustFontSize('contentSize', -1)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <RiSubtractLine className="text-sm" />
              </button>
              <span className="text-xs w-6 text-center">{style.contentSize}</span>
              <button
                onClick={() => adjustFontSize('contentSize', 1)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <RiAddLine className="text-sm" />
              </button>
            </div>
          </div>

          {/* 第三行：透明度 + 间距 */}
          <div className="flex items-center gap-6">
            {/* 底板透明度 */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">底板透明度</span>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.02"
                value={style.bgOpacity}
                onChange={(e) => setStyle({ ...style, bgOpacity: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 appearance-none bg-gray-200 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-500 w-8">{Math.round(style.bgOpacity * 100)}%</span>
            </div>

            {/* 段落间距 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">段距</span>
              <input
                type="range"
                min="8"
                max="24"
                step="2"
                value={style.sectionGap}
                onChange={(e) => setStyle({ ...style, sectionGap: parseInt(e.target.value) })}
                className="w-16 h-1.5 appearance-none bg-gray-200 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-500 w-6">{style.sectionGap}</span>
            </div>
          </div>

          {/* 导出按钮 */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={handleExport}
              className="w-full py-2.5 bg-[#FF2442] text-white rounded-lg font-medium hover:bg-[#E61E3B] flex items-center justify-center gap-2"
            >
              <RiDownloadLine /> 导出图片
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
