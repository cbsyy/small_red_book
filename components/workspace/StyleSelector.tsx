'use client';

import { useState, useEffect } from 'react';
import { RiAddLine, RiCloseLine, RiShuffleLine, RiLoader4Line } from 'react-icons/ri';

// 风格类型
export interface ImageStyle {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  promptSnippet: string;
  enabled: boolean;
  order: number;
}

interface StyleSelectorProps {
  selectedStyles: string[];  // 选中的风格 ID 列表
  onStyleChange: (styleIds: string[]) => void;
  customPrompt: string;  // 用户自定义补充说明
  onCustomPromptChange: (prompt: string) => void;
  onRandomStyle?: () => void;  // 随机风格
  disabled?: boolean;
}

export default function StyleSelector({
  selectedStyles,
  onStyleChange,
  customPrompt,
  onCustomPromptChange,
  onRandomStyle,
  disabled = false,
}: StyleSelectorProps) {
  const [styles, setStyles] = useState<ImageStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [autoSelectNewStyle, setAutoSelectNewStyle] = useState(true);

  // 获取风格列表
  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const res = await fetch('/api/image-style');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStyles(data.data);
      }
    } catch (err) {
      console.error('获取风格列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 切换风格选择
  const toggleStyle = (styleId: string) => {
    if (disabled) return;

    if (selectedStyles.includes(styleId)) {
      onStyleChange(selectedStyles.filter(id => id !== styleId));
    } else {
      onStyleChange([...selectedStyles, styleId]);
    }
  };

  // 添加自定义风格
  const handleAddStyle = async () => {
    if (!newStyleName.trim() || !newStylePrompt.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch('/api/image-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStyleName.trim(),
          promptSnippet: newStylePrompt.trim(),
          icon: '🏷️',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStyles([...styles, data.data]);
        // 只有勾选了"立即选中"才自动选中新风格
        if (autoSelectNewStyle) {
          onStyleChange([...selectedStyles, data.data.id]);
        }
        setNewStyleName('');
        setNewStylePrompt('');
        setShowAddInput(false);
      }
    } catch (err) {
      console.error('添加风格失败:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // 随机选择风格
  const handleRandomStyle = () => {
    if (disabled || styles.length === 0) return;

    // 随机选择 1-3 个风格
    const count = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...styles].sort(() => Math.random() - 0.5);
    const randomIds = shuffled.slice(0, count).map(s => s.id);
    onStyleChange(randomIds);

    if (onRandomStyle) {
      onRandomStyle();
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="flex items-center justify-center py-4">
          <RiLoader4Line className="text-xl text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          🎨 图像风格
        </h3>
        <button
          onClick={handleRandomStyle}
          disabled={disabled}
          className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"
        >
          <RiShuffleLine /> 随机风格
        </button>
      </div>

      {/* 风格标签 */}
      <div className="flex flex-wrap gap-2">
        {styles.length === 0 ? (
          <div className="w-full text-center py-4 text-gray-400 text-sm">
            暂无风格标签，点击下方「添加」创建
          </div>
        ) : (
          styles.map((style) => {
            const isSelected = selectedStyles.includes(style.id);
            return (
              <button
                key={style.id}
                onClick={() => toggleStyle(style.id)}
                disabled={disabled}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all
                  flex items-center gap-1.5
                  ${isSelected
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span>{style.icon}</span>
                <span>{style.name}</span>
                {isSelected && (
                  <RiCloseLine className="text-white/80" />
                )}
              </button>
            );
          })
        )}

        {/* 添加自定义风格按钮 */}
        {!showAddInput && (
          <button
            onClick={() => setShowAddInput(true)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-500 border border-dashed border-gray-300 hover:border-purple-400 hover:text-purple-600 flex items-center gap-1 disabled:opacity-50"
          >
            <RiAddLine /> 添加
          </button>
        )}
      </div>

      {/* 添加自定义风格输入框 */}
      {showAddInput && (
        <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-2">
          <input
            type="text"
            value={newStyleName}
            onChange={(e) => setNewStyleName(e.target.value)}
            placeholder="风格名称（如：像素风）"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none"
          />
          <input
            type="text"
            value={newStylePrompt}
            onChange={(e) => setNewStylePrompt(e.target.value)}
            placeholder="英文提示词（如：pixel art style, 8-bit）"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSelectNewStyle}
                onChange={(e) => setAutoSelectNewStyle(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-purple-600"
              />
              添加后立即选中
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddInput(false);
                  setNewStyleName('');
                  setNewStylePrompt('');
                }}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={handleAddStyle}
                disabled={isAdding || !newStyleName.trim() || !newStylePrompt.trim()}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-1"
              >
                {isAdding ? <RiLoader4Line className="animate-spin" /> : <RiAddLine />}
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户补充说明 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">
          💬 补充说明（可选）
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          disabled={disabled}
          placeholder="告诉 AI 你的想法，如：我希望整体偏暖色调，有一些小动物元素..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* 选中的风格提示 */}
      {selectedStyles.length > 0 && (
        <div className="text-xs text-gray-500">
          已选择 {selectedStyles.length} 个风格：
          {styles
            .filter(s => selectedStyles.includes(s.id))
            .map(s => s.name)
            .join('、')}
        </div>
      )}
    </div>
  );
}
