'use client';

import { useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiDownloadLine, RiLoader4Line, RiRefreshLine } from 'react-icons/ri';
import { useCardStore } from '@/store/useCardStore';
import CardRenderer from './CardRenderer';

export default function CardPreview() {
  const {
    cards,
    currentCardIndex,
    setCurrentCardIndex,
    cardStyle,
    updateCard,
    generatingImages,
  } = useCardStore();

  const [downloading, setDownloading] = useState(false);

  const currentCard = cards[currentCardIndex];

  const handlePrev = () => {
    setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
  };

  const handleNext = () => {
    setCurrentCardIndex(Math.min(cards.length - 1, currentCardIndex + 1));
  };

  const handleRender = (dataUrl: string) => {
    updateCard(currentCardIndex, { finalImage: dataUrl });
  };

  const handleDownloadCurrent = () => {
    if (!currentCard?.finalImage) return;

    const link = document.createElement('a');
    link.download = `小红书卡片_${currentCard.pageNumber}.png`;
    link.href = currentCard.finalImage;
    link.click();
  };

  const handleDownloadAll = async () => {
    if (cards.length === 0) return;

    setDownloading(true);

    try {
      // 动态导入 JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      cards.forEach((card, index) => {
        if (card.finalImage) {
          const base64Data = card.finalImage.split(',')[1];
          zip.file(`小红书卡片_${index + 1}.png`, base64Data, { base64: true });
        }
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = '小红书卡片合集.zip';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('下载失败:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <p>暂无卡片预览</p>
        <p className="text-sm mt-2">请先生成卡片</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 预览区域 */}
      <div className="relative flex items-center justify-center min-h-[500px] bg-gray-100 rounded-2xl p-4">
        {generatingImages && currentCard?.status === 'generating' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl z-10">
            <div className="text-white text-center">
              <RiLoader4Line className="text-4xl animate-spin mx-auto mb-2" />
              <p>正在生成背景图...</p>
            </div>
          </div>
        )}

        {currentCard?.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center rounded-2xl z-10">
            <div className="text-red-500 text-center">
              <p className="font-bold">生成失败</p>
              <p className="text-sm mt-1">{currentCard.error}</p>
            </div>
          </div>
        )}

        {currentCard && (
          <CardRenderer
            card={currentCard}
            style={cardStyle}
            onRender={handleRender}
          />
        )}
      </div>

      {/* 控制栏 */}
      <div className="flex items-center justify-between">
        {/* 分页控制 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentCardIndex === 0}
            className="p-2 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
          >
            <RiArrowLeftSLine className="text-xl" />
          </button>

          <div className="flex items-center gap-1">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCardIndex(index)}
                className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                  index === currentCardIndex
                    ? 'bg-[#FF2442] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentCardIndex === cards.length - 1}
            className="p-2 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
          >
            <RiArrowRightSLine className="text-xl" />
          </button>
        </div>

        {/* 下载按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCurrent}
            disabled={!currentCard?.finalImage}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <RiDownloadLine />
            下载当前
          </button>

          <button
            onClick={handleDownloadAll}
            disabled={downloading || cards.every((c) => !c.finalImage)}
            className="px-4 py-2 bg-[#FF2442] text-white rounded-xl font-medium hover:bg-[#E61E3B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {downloading ? (
              <>
                <RiLoader4Line className="animate-spin" />
                打包中...
              </>
            ) : (
              <>
                <RiDownloadLine />
                下载全部
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
