'use client';

import { useState, useEffect } from 'react';
import { RiImageLine, RiLoader4Line, RiSparklingFill } from 'react-icons/ri';
import { useCardStore } from '@/store/useCardStore';
import ArticleInput from './ArticleInput';
import OutlineEditor from './OutlineEditor';
import CardPreview from './CardPreview';
import type { GeneratedCard } from '@/types';

type AIProfile = {
  id: string;
  name: string;
  enabled: boolean;
};

export default function CardGenerator() {
  const {
    articleContent,
    parsedArticle,
    setCards,
    updateCard,
    generatingImages,
    setGeneratingImages,
    setCurrentCardIndex,
  } = useCardStore();

  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // 获取 AI 配置列表
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/ai-profile');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const enabledProfiles = data.data.filter((p: AIProfile) => p.enabled);
            setProfiles(enabledProfiles);
            if (enabledProfiles.length > 0 && !activeProfileId) {
              setActiveProfileId(enabledProfiles[0].id);
            }
          }
        }
      } catch (err) {
        console.error('获取 AI 配置失败:', err);
      }
    };
    fetchProfiles();
  }, [activeProfileId]);

  const handleGenerateCards = async () => {
    if (!parsedArticle || parsedArticle.outline.length === 0) {
      setError('请先生成大纲');
      return;
    }

    if (profiles.length === 0) {
      setError('请先在 AI 配置管理中添加配置');
      return;
    }

    setError('');
    setGeneratingImages(true);

    // 初始化卡片数据
    const initialCards: GeneratedCard[] = parsedArticle.outline.map((item) => ({
      pageNumber: item.pageNumber,
      title: item.title,
      content: item.content,
      imagePrompt: item.imagePrompt,
      backgroundImage: '',
      finalImage: '',
      status: 'pending' as const,
    }));

    setCards(initialCards);
    setCurrentCardIndex(0);

    // 逐个生成背景图
    for (let i = 0; i < initialCards.length; i++) {
      setCurrentCardIndex(i);
      updateCard(i, { status: 'generating' });

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: initialCards[i].imagePrompt,
            profileId: activeProfileId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || '图片生成失败');
        }

        let imageUrl = data.data.imageUrl;
        if (!imageUrl && data.data.imageBase64) {
          imageUrl = `data:image/png;base64,${data.data.imageBase64}`;
        }

        updateCard(i, {
          backgroundImage: imageUrl,
          status: 'completed',
        });
      } catch (err: any) {
        updateCard(i, {
          status: 'error',
          error: err.message,
        });
      }
    }

    setGeneratingImages(false);
    setCurrentCardIndex(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 左侧：输入和编辑 */}
      <div className="space-y-8">
        {/* 文章输入 */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-[#FF2442] text-white rounded-full flex items-center justify-center text-sm">1</span>
            输入文章
          </h2>
          <ArticleInput />

          {/* 文章内容预览 */}
          {articleContent && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                {articleContent.substring(0, 500)}...
              </p>
            </div>
          )}
        </section>

        {/* 大纲编辑 */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-[#FF2442] text-white rounded-full flex items-center justify-center text-sm">2</span>
            生成大纲
          </h2>
          <OutlineEditor />
        </section>

        {/* 生成卡片按钮 */}
        {parsedArticle && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-[#FF2442] text-white rounded-full flex items-center justify-center text-sm">3</span>
              生成卡片
            </h2>

            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}

            <button
              onClick={handleGenerateCards}
              disabled={generatingImages || profiles.length === 0}
              className="w-full py-4 bg-gradient-to-r from-[#FF2442] to-[#FF6B81] text-white font-bold text-lg rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-200"
            >
              {generatingImages ? (
                <>
                  <RiLoader4Line className="animate-spin text-xl" />
                  正在生成卡片...
                </>
              ) : (
                <>
                  <RiImageLine className="text-xl" />
                  生成 {parsedArticle.outline.length} 张卡片
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              将为每页内容生成 AI 背景图并合成卡片
            </p>
          </section>
        )}
      </div>

      {/* 右侧：卡片预览 */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <RiSparklingFill className="text-[#FF2442]" />
            卡片预览
          </h2>
          <CardPreview />
        </section>
      </div>
    </div>
  );
}
