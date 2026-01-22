'use client';

import { useState, useEffect, useRef } from 'react';
import {
  RiTranslate2,
  RiImageLine,
  RiDownloadLine,
  RiZoomInLine,
  RiCloseLine,
  RiRefreshLine,
  RiCheckLine,
  RiLoader4Line,
  RiFileCopyLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiArrowGoBackLine,
} from 'react-icons/ri';

// 卡片数据类型
interface CardData {
  pageNumber: number;
  pageType: string;
  title: string;
  subtitle?: string;
  points: Array<{ emoji: string; label: string; detail?: string }>;
  imagePrompt: string;
  imagePromptExplain: string;
  generatedImageUrl?: string;
  status: 'draft' | 'generating' | 'completed' | 'error';
  error?: string;
}

interface PromptEditStepProps {
  cards: CardData[];
  onCardsChange: (cards: CardData[]) => void;
  onGenerateImage: (cardIndex: number, prompt: string) => Promise<string>;
  onTranslateToEnglish: (chinese: string) => Promise<string>;
  onBack?: () => void;
  onNext?: () => void;
}

export default function PromptEditStep({
  cards,
  onCardsChange,
  onGenerateImage,
  onTranslateToEnglish,
  onBack,
  onNext,
}: PromptEditStepProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingPromptChinese, setEditingPromptChinese] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);

  // 保存 AI 原始生成的 prompt（用于恢复）
  const originalPromptsRef = useRef<Map<number, { en: string; zh: string }>>(new Map());

  const selectedCard = cards[selectedCardIndex];

  // 同步编辑状态，并保存原始值
  useEffect(() => {
    if (selectedCard) {
      setEditingPrompt(selectedCard.imagePrompt || '');
      setEditingPromptChinese(selectedCard.imagePromptExplain || '');

      // 首次加载时保存 AI 原始值
      if (!originalPromptsRef.current.has(selectedCardIndex)) {
        originalPromptsRef.current.set(selectedCardIndex, {
          en: selectedCard.imagePrompt || '',
          zh: selectedCard.imagePromptExplain || '',
        });
      }
    }
  }, [selectedCardIndex, selectedCard]);

  // 更新卡片数据
  const updateCard = (index: number, updates: Partial<CardData>) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], ...updates };
    onCardsChange(newCards);
  };

  // 恢复 AI 原始 prompt
  const handleRestoreOriginal = () => {
    const original = originalPromptsRef.current.get(selectedCardIndex);
    if (original) {
      setEditingPrompt(original.en);
      setEditingPromptChinese(original.zh);
      updateCard(selectedCardIndex, {
        imagePrompt: original.en,
        imagePromptExplain: original.zh,
      });
    }
  };

  // 检查是否有修改
  const hasModified = () => {
    const original = originalPromptsRef.current.get(selectedCardIndex);
    if (!original) return false;
    return editingPrompt !== original.en || editingPromptChinese !== original.zh;
  };

  // 中文翻译成英文
  const handleTranslate = async () => {
    if (!editingPromptChinese.trim()) return;

    setIsTranslating(true);
    try {
      const englishPrompt = await onTranslateToEnglish(editingPromptChinese);
      setEditingPrompt(englishPrompt);
      updateCard(selectedCardIndex, {
        imagePrompt: englishPrompt,
        imagePromptExplain: editingPromptChinese,
      });
    } catch (error) {
      console.error('翻译失败:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // 生成单张图片
  const handleGenerateImage = async () => {
    if (!editingPrompt.trim()) {
      alert('英文 Prompt 为空，请先填写中文描述并点击"同步到英文"');
      return;
    }

    updateCard(selectedCardIndex, { status: 'generating' });

    try {
      const imageUrl = await onGenerateImage(selectedCardIndex, editingPrompt);
      updateCard(selectedCardIndex, {
        generatedImageUrl: imageUrl,
        status: 'completed',
        imagePrompt: editingPrompt,
        imagePromptExplain: editingPromptChinese,
      });
    } catch (error: any) {
      updateCard(selectedCardIndex, {
        status: 'error',
        error: error.message || '生成失败',
      });
    }
  };

  // 下载单张图片
  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
      window.open(imageUrl, '_blank');
    }
  };

  // 下载所有图片
  const downloadAllImages = async () => {
    const completedCards = cards.filter(c => c.generatedImageUrl);
    for (let i = 0; i < completedCards.length; i++) {
      const card = completedCards[i];
      await downloadImage(
        card.generatedImageUrl!,
        `card_${card.pageNumber}_${card.title.slice(0, 10)}.png`
      );
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // 复制 prompt 到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 生成所有图片
  const handleGenerateAll = async () => {
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].status !== 'completed' && cards[i].imagePrompt) {
        setSelectedCardIndex(i);
        updateCard(i, { status: 'generating' });
        try {
          const imageUrl = await onGenerateImage(i, cards[i].imagePrompt);
          updateCard(i, {
            generatedImageUrl: imageUrl,
            status: 'completed',
          });
        } catch (error: any) {
          updateCard(i, {
            status: 'error',
            error: error.message || '生成失败',
          });
        }
      }
    }
  };

  const completedCount = cards.filter(c => c.status === 'completed').length;
  const hasValidPrompts = cards.some(c => c.imagePrompt);

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white/80 backdrop-blur rounded-2xl">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">查看 / 微调 Prompt</h2>
          <span className="text-sm text-gray-500">
            AI 已生成 {cards.length} 张卡片，已完成图片 {completedCount} 张
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasValidPrompts && (
            <button
              onClick={handleGenerateAll}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
            >
              <RiImageLine />
              全部生成
            </button>
          )}
          {completedCount > 0 && (
            <button
              onClick={downloadAllImages}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2"
            >
              <RiDownloadLine />
              下载全部
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧：卡片列表 */}
        <div className="w-48 flex-shrink-0 space-y-3">
          {cards.map((card, index) => (
            <div
              key={index}
              onClick={() => setSelectedCardIndex(index)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                selectedCardIndex === index
                  ? 'bg-orange-100 border-2 border-orange-400'
                  : 'bg-white/80 hover:bg-white border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  第 {card.pageNumber} 页
                </span>
                <div className="flex items-center gap-1">
                  {!card.imagePrompt && (
                    <span className="text-amber-500 text-xs">缺Prompt</span>
                  )}
                  {card.status === 'completed' && (
                    <RiCheckLine className="text-green-500" />
                  )}
                  {card.status === 'generating' && (
                    <RiLoader4Line className="text-orange-500 animate-spin" />
                  )}
                  {card.status === 'error' && (
                    <span className="text-red-500 text-xs">失败</span>
                  )}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-800 truncate">
                {card.title}
              </p>
              {card.generatedImageUrl && (
                <img
                  src={card.generatedImageUrl}
                  alt={card.title}
                  className="w-full h-20 object-cover rounded-lg mt-2"
                />
              )}
            </div>
          ))}
        </div>

        {/* 中间：Prompt 查看/编辑区 */}
        <div className="flex-1 bg-white/90 backdrop-blur rounded-2xl p-6">
          {selectedCard && (
            <>
              {/* 卡片信息 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full">
                    {selectedCard.pageType}
                  </span>
                  <span className="text-sm text-gray-500">
                    第 {selectedCard.pageNumber} 页
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedCard.title}
                </h3>
                {selectedCard.subtitle && (
                  <p className="text-gray-600 mt-1">{selectedCard.subtitle}</p>
                )}
                {selectedCard.points.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {selectedCard.points.map((point, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span>{point.emoji}</span>
                        <span className="font-medium">{point.label}</span>
                        {point.detail && (
                          <span className="text-gray-500">- {point.detail}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prompt 查看/编辑器 */}
              <div className="space-y-4">
                {/* 状态提示 */}
                {editingPrompt && editingPromptChinese && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center justify-between">
                    <span>AI 已生成图像描述，可直接生成图片，或微调后再生成</span>
                    {hasModified() && (
                      <button
                        onClick={handleRestoreOriginal}
                        className="flex items-center gap-1 text-green-600 hover:text-green-800 font-medium"
                      >
                        <RiArrowGoBackLine />
                        恢复原文
                      </button>
                    )}
                  </div>
                )}
                {!editingPrompt && !editingPromptChinese && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    AI 未能生成此卡片的图像描述，请手动填写中文描述后点击"同步到英文"
                  </div>
                )}
                {editingPrompt && !editingPromptChinese && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    已有英文 Prompt，可直接生成图片
                  </div>
                )}

                {/* 中文描述 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      📝 中文描述
                    </label>
                    <div className="flex items-center gap-2">
                      {hasModified() && (
                        <button
                          onClick={handleRestoreOriginal}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <RiArrowGoBackLine />
                          恢复
                        </button>
                      )}
                      <button
                        onClick={handleTranslate}
                        disabled={isTranslating || !editingPromptChinese.trim()}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition flex items-center gap-1 disabled:opacity-50"
                      >
                        {isTranslating ? (
                          <RiLoader4Line className="animate-spin" />
                        ) : (
                          <RiTranslate2 />
                        )}
                        同步到英文
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={editingPromptChinese}
                    onChange={(e) => setEditingPromptChinese(e.target.value)}
                    placeholder="描述你想要的图片效果..."
                    className="w-full h-28 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    可直接生成图片，或修改中文后点击"同步到英文"更新
                  </p>
                </div>

                {/* 英文 Prompt（可折叠） */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      🔤 英文 Prompt（传给 AI 绘图模型）
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowEnglish(!showEnglish)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        {showEnglish ? '收起' : '展开编辑'}
                      </button>
                      {editingPrompt && (
                        <button
                          onClick={() => copyToClipboard(editingPrompt)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title="复制"
                        >
                          <RiFileCopyLine />
                        </button>
                      )}
                    </div>
                  </div>
                  {showEnglish ? (
                    <textarea
                      value={editingPrompt}
                      onChange={(e) => setEditingPrompt(e.target.value)}
                      placeholder="English prompt for AI image generation..."
                      className="w-full h-28 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none resize-none font-mono text-sm bg-gray-50"
                    />
                  ) : editingPrompt ? (
                    <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600 font-mono line-clamp-2 cursor-pointer hover:bg-gray-100" onClick={() => setShowEnglish(true)}>
                      {editingPrompt}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-400 italic">
                      暂无英文 Prompt，请填写中文后同步
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleGenerateImage}
                    disabled={selectedCard.status === 'generating' || !editingPrompt}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedCard.status === 'generating' ? (
                      <>
                        <RiLoader4Line className="animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <RiImageLine />
                        生成图片
                      </>
                    )}
                  </button>
                  {selectedCard.generatedImageUrl && (
                    <button
                      onClick={handleGenerateImage}
                      disabled={selectedCard.status === 'generating'}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <RiRefreshLine />
                      重新生成
                    </button>
                  )}
                </div>

                {/* 错误提示 */}
                {selectedCard.status === 'error' && selectedCard.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {selectedCard.error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 右侧：图片预览 */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white/90 backdrop-blur rounded-2xl p-4 sticky top-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">图片预览</h4>

            {selectedCard?.generatedImageUrl ? (
              <div className="relative group">
                <img
                  src={selectedCard.generatedImageUrl}
                  alt={selectedCard.title}
                  className="w-full rounded-xl shadow-lg cursor-pointer"
                  onClick={() => setPreviewImage(selectedCard.generatedImageUrl!)}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPreviewImage(selectedCard.generatedImageUrl!)}
                    className="p-2 bg-white/90 rounded-full hover:bg-white transition"
                    title="放大预览"
                  >
                    <RiZoomInLine className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => downloadImage(
                      selectedCard.generatedImageUrl!,
                      `card_${selectedCard.pageNumber}.png`
                    )}
                    className="p-2 bg-white/90 rounded-full hover:bg-white transition"
                    title="下载"
                  >
                    <RiDownloadLine className="text-gray-700" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <RiImageLine className="text-4xl mx-auto mb-2" />
                  <p className="text-sm">
                    {editingPrompt ? '点击生成图片' : '等待 Prompt'}
                  </p>
                </div>
              </div>
            )}

            {/* 快速导航 */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setSelectedCardIndex(Math.max(0, selectedCardIndex - 1))}
                disabled={selectedCardIndex === 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RiArrowLeftLine />
              </button>
              <span className="text-sm text-gray-500">
                {selectedCardIndex + 1} / {cards.length}
              </span>
              <button
                onClick={() => setSelectedCardIndex(Math.min(cards.length - 1, selectedCardIndex + 1))}
                disabled={selectedCardIndex === cards.length - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RiArrowRightLine />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="flex items-center justify-between mt-8 p-4 bg-white/80 backdrop-blur rounded-2xl">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 transition"
        >
          ← 返回上一步
        </button>
        <button
          onClick={onNext}
          disabled={completedCount === 0}
          className="px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
        >
          下一步 →
        </button>
      </div>

      {/* 图片放大预览 Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={previewImage}
              alt="预览"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
            >
              <RiCloseLine className="text-xl" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(previewImage, 'card.png');
                }}
                className="px-4 py-2 bg-white/90 backdrop-blur rounded-lg hover:bg-white transition flex items-center gap-2"
              >
                <RiDownloadLine />
                下载图片
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
