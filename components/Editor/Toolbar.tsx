'use client';

import { useEditorStore, useThemeStore } from '@/store';
import { createTextElement, createImageElement, createRectElement, CANVAS_PRESETS } from '@/types';

// 图标组件
const Icons = {
  Text: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  ),
  Image: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  Rect: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  ),
  Undo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  ),
  Redo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
    </svg>
  ),
  Sun: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  ZoomIn: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  ZoomOut: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

export default function Toolbar() {
  const { addElement, undo, redo, zoom, setZoom, canvasSize, setCanvasSize } = useEditorStore();
  const { mode, toggleMode } = useThemeStore();

  const handleAddText = () => {
    addElement(createTextElement());
  };

  const handleAddImage = () => {
    addElement(createImageElement({ name: '图片占位' }));
  };

  const handleAddRect = () => {
    addElement(createRectElement());
  };

  return (
    <div className="editor-toolbar flex items-center justify-between px-4">
      {/* 左侧：添加元素 */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted mr-2">添加</span>
        <ToolButton icon={<Icons.Text />} label="文字" onClick={handleAddText} />
        <ToolButton icon={<Icons.Image />} label="图片" onClick={handleAddImage} />
        <ToolButton icon={<Icons.Rect />} label="矩形" onClick={handleAddRect} />

        <div className="w-px h-6 bg-tertiary mx-2" />

        <ToolButton icon={<Icons.Undo />} label="撤销" onClick={undo} />
        <ToolButton icon={<Icons.Redo />} label="重做" onClick={redo} />
      </div>

      {/* 中间：画布尺寸 */}
      <div className="flex items-center gap-2">
        <select
          value={`${canvasSize.width}x${canvasSize.height}`}
          onChange={(e) => {
            const preset = CANVAS_PRESETS.find(
              (p) => `${p.width}x${p.height}` === e.target.value
            );
            if (preset) setCanvasSize(preset);
          }}
          className="select text-sm py-1 px-2 w-48"
        >
          {CANVAS_PRESETS.map((preset) => (
            <option key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* 右侧：缩放和主题 */}
      <div className="flex items-center gap-1">
        <ToolButton icon={<Icons.ZoomOut />} label="缩小" onClick={() => setZoom(zoom - 0.1)} />
        <span className="text-xs text-secondary w-12 text-center">{Math.round(zoom * 100)}%</span>
        <ToolButton icon={<Icons.ZoomIn />} label="放大" onClick={() => setZoom(zoom + 0.1)} />

        <div className="w-px h-6 bg-tertiary mx-2" />

        <ToolButton
          icon={mode === 'light' ? <Icons.Moon /> : <Icons.Sun />}
          label={mode === 'light' ? '深色' : '浅色'}
          onClick={toggleMode}
        />
      </div>
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function ToolButton({ icon, label, onClick, active }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-colors ${
        active ? 'bg-accent text-white' : 'hover:bg-tertiary text-secondary hover:text-primary'
      }`}
    >
      {icon}
    </button>
  );
}
