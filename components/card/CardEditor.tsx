'use client';

import { useState } from 'react';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiDownloadLine,
  RiRefreshLine,
  RiEditLine,
  RiImageLine,
} from 'react-icons/ri';
import CardRenderer from './CardRenderer';
import BackgroundSelector from './BackgroundSelector';

/**
 * 卡片内容类型
 */
interface CardSection {
  emoji: string;
  label: string;
  content: string;
}

interface CardContent {
  title: string;
  subtitle?: string;
  sections: CardSection[];
}

interface CardData {
  id: string;
  pageNumber: number;
  content: CardContent;
  backgroundUrl?: string;
}

interface CardEditorProps {
  cards: CardData[];
  onCardsChange: (cards: CardData[]) => void;
  onGenerateBackground?: (prompt: string) => Promise<string>;
  onExportAll?: (images: string[]) => void;
}

export default function CardEditor({
  cards,
  onCardsChange,
  onGenerateBackground,
  onExportAll,
}: CardEditorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState<'content' | 'background'>('background');
  const [exportedImages, setExportedImages] = useState<string[]>([]);

  const currentCard = cards[currentIndex];

  // 更新当前卡片
  const updateCurrentCard = (updates: Partial<CardData>) => {
    const newCards = cards.map((card, index) =>
      index === currentIndex ? { ...card, ...updates } : card
    );
    onCardsChange(newCards);
  };

  // 更新内容字段
  const updateContent = (field: string, value: any) => {
    updateCurrentCard({
      content: { ...currentCard.content, [field]: value },
    });
  };

  // 更新 section
  const updateSection = (sectionIndex: number, updates: Partial<CardSection>) => {
    const newSections = currentCard.content.sections.map((section, index) =>
      index === sectionIndex ? { ...section, ...updates } : section
    );
    updateCurrentCard({
      content: { ...currentCard.content, sections: newSections },
    });
  };

  // 添加 section
  const addSection = () => {
    const newSections = [
      ...currentCard.content.sections,
      { emoji: '📌', label: '新要点', content: '' },
    ];
    updateCurrentCard({
      content: { ...currentCard.content, sections: newSections },
    });
  };

  // 删除 section
  const removeSection = (sectionIndex: number) => {
    const newSections = currentCard.content.sections.filter(
      (_, index) => index !== sectionIndex
    );
    updateCurrentCard({
      content: { ...currentCard.content, sections: newSections },
    });
  };

  // 选择背景
  const handleSelectBackground = (url: string) => {
    updateCurrentCard({ backgroundUrl: url });
  };

  // 导出单张
  const handleExport = (dataUrl: string) => {
    const newExported = [...exportedImages];
    newExported[currentIndex] = dataUrl;
    setExportedImages(newExported);

    // 下载
    const link = document.createElement('a');
    link.download = `card-${currentCard.pageNumber}.png`;
    link.href = dataUrl;
    link.click();
  };

  // 导出全部
  const handleExportAll = () => {
    if (exportedImages.filter(Boolean).length === cards.length) {
      onExportAll?.(exportedImages);
    } else {
      alert('请先预览并确认所有卡片');
    }
  };

  if (!currentCard) {
    return <div className="text-center text-gray-400 py-8">暂无卡片</div>;
  }

  return (
    <div className="flex gap-6">
      {/* 左侧：预览区 */}
      <div className="flex-shrink-0">
        <CardRenderer
          content={currentCard.content}
          backgroundUrl={currentCard.backgroundUrl || '/placeholder-bg.png'}
          width={360}
          height={480}
          editable={true}
          onExport={handleExport}
        />

        {/* 页码导航 */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RiArrowLeftLine className="text-xl" />
          </button>
          <span className="text-sm font-medium">
            {currentIndex + 1} / {cards.length}
          </span>
          <button
            onClick={() => setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1))}
            disabled={currentIndex === cards.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RiArrowRightLine className="text-xl" />
          </button>
        </div>
      </div>

      {/* 右侧：编辑区 */}
      <div className="flex-1 min-w-0">
        {/* 模式切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setEditMode('background')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
              editMode === 'background'
                ? 'bg-[#FF2442] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RiImageLine /> 选择背景
          </button>
          <button
            onClick={() => setEditMode('content')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
              editMode === 'content'
                ? 'bg-[#FF2442] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RiEditLine /> 编辑内容
          </button>
        </div>

        {/* 背景选择 */}
        {editMode === 'background' && (
          <BackgroundSelector
            currentUrl={currentCard.backgroundUrl}
            onSelect={handleSelectBackground}
            onGenerate={onGenerateBackground}
          />
        )}

        {/* 内容编辑 */}
        {editMode === 'content' && (
          <div className="space-y-4">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题
              </label>
              <input
                type="text"
                value={currentCard.content.title}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#FF2442] outline-none"
              />
            </div>

            {/* 副标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                副标题（可选）
              </label>
              <input
                type="text"
                value={currentCard.content.subtitle || ''}
                onChange={(e) => updateContent('subtitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#FF2442] outline-none"
              />
            </div>

            {/* 内容区块 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  内容要点
                </label>
                <button
                  onClick={addSection}
                  className="text-sm text-[#FF2442] hover:underline"
                >
                  + 添加要点
                </button>
              </div>
              <div className="space-y-3">
                {currentCard.content.sections.map((section, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={section.emoji}
                        onChange={(e) =>
                          updateSection(index, { emoji: e.target.value })
                        }
                        className="w-12 px-2 py-1 border border-gray-200 rounded text-center"
                        placeholder="📌"
                      />
                      <input
                        type="text"
                        value={section.label}
                        onChange={(e) =>
                          updateSection(index, { label: e.target.value })
                        }
                        className="flex-1 px-3 py-1 border border-gray-200 rounded"
                        placeholder="标签"
                      />
                      <button
                        onClick={() => removeSection(index)}
                        className="px-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      type="text"
                      value={section.content}
                      onChange={(e) =>
                        updateSection(index, { content: e.target.value })
                      }
                      className="w-full px-3 py-1 border border-gray-200 rounded"
                      placeholder="内容描述"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 底部操作 */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={handleExportAll}
            disabled={cards.length === 0}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <RiDownloadLine /> 导出全部
          </button>
        </div>
      </div>
    </div>
  );
}
