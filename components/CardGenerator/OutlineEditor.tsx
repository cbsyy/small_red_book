'use client';

import { useState, useEffect } from 'react';
import { RiLoader4Line, RiSparklingFill, RiEditLine, RiDeleteBinLine, RiAddLine } from 'react-icons/ri';
import { useCardStore } from '@/store/useCardStore';
import type { OutlineItem } from '@/types';

type AIProfile = {
  id: string;
  name: string;
  textModel: string;
  enabled: boolean;
};

export default function OutlineEditor() {
  const {
    articleContent,
    articleTitle,
    parsedArticle,
    setParsedArticle,
    parsingOutline,
    setParsingOutline,
    updateOutlineItem,
  } = useCardStore();

  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageCount, setPageCount] = useState(5);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
            // 自动选择第一个启用的配置
            if (enabledProfiles.length > 0 && !activeProfileId) {
              setActiveProfileId(enabledProfiles[0].id);
            }
          }
        }
      } catch (err) {
        console.error('获取 AI 配置失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [activeProfileId]);

  const handleParse = async () => {
    if (!articleContent.trim()) {
      setError('请先抓取文章内容');
      return;
    }

    if (profiles.length === 0) {
      setError('请先配置 AI 模型');
      return;
    }

    setError('');
    setParsingOutline(true);

    try {
      const res = await fetch('/api/parse-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: articleContent,
          title: articleTitle,
          pageCount,
          profileId: activeProfileId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '解析失败');
      }

      setParsedArticle(data.data);
    } catch (err: any) {
      setError(err.message || '解析失败，请稍后重试');
    } finally {
      setParsingOutline(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof OutlineItem, value: string | number) => {
    updateOutlineItem(index, { [field]: value });
  };

  const handleDeleteItem = (index: number) => {
    if (!parsedArticle) return;
    const newOutline = parsedArticle.outline.filter((_, i) => i !== index);
    newOutline.forEach((item, i) => {
      item.pageNumber = i + 1;
    });
    setParsedArticle({ ...parsedArticle, outline: newOutline });
  };

  const handleAddItem = () => {
    if (!parsedArticle) return;
    const newItem: OutlineItem = {
      pageNumber: parsedArticle.outline.length + 1,
      title: '新章节',
      content: '在此编辑内容...',
      imagePrompt: 'A beautiful abstract background with soft colors',
    };
    setParsedArticle({
      ...parsedArticle,
      outline: [...parsedArticle.outline, newItem],
    });
  };

  return (
    <div className="space-y-6">
      {/* 解析控制 */}
      <div className="flex flex-wrap items-center gap-4">
        {/* AI 配置选择 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">AI 配置：</label>
          <select
            value={activeProfileId || ''}
            onChange={(e) => setActiveProfileId(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#FF2442] min-w-[160px]"
            disabled={parsingOutline || loading}
          >
            {loading ? (
              <option value="">加载中...</option>
            ) : profiles.length === 0 ? (
              <option value="">请先配置模型</option>
            ) : (
              profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.textModel})
                </option>
              ))
            )}
          </select>
        </div>

        {/* 生成页数 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">生成页数：</label>
          <select
            value={pageCount}
            onChange={(e) => setPageCount(Number(e.target.value))}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#FF2442]"
            disabled={parsingOutline}
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n} 页</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleParse}
          disabled={parsingOutline || !articleContent.trim() || profiles.length === 0}
          className="px-6 py-2.5 bg-gradient-to-r from-[#FF2442] to-[#FF6B81] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {parsingOutline ? (
            <>
              <RiLoader4Line className="animate-spin" />
              AI解析中...
            </>
          ) : (
            <>
              <RiSparklingFill />
              AI生成大纲
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* 大纲编辑器 */}
      {parsedArticle && (
        <div className="space-y-4">
          {/* 标题和简介 */}
          <div className="p-4 bg-gradient-to-r from-[#FF2442]/5 to-[#FF6B81]/5 rounded-2xl border border-[#FF2442]/10">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">标题</label>
                <input
                  type="text"
                  value={parsedArticle.title}
                  onChange={(e) => setParsedArticle({ ...parsedArticle, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-lg font-bold outline-none focus:border-[#FF2442]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">简介</label>
                <input
                  type="text"
                  value={parsedArticle.introduction}
                  onChange={(e) => setParsedArticle({ ...parsedArticle, introduction: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#FF2442]"
                />
              </div>
            </div>
          </div>

          {/* 各页内容 */}
          <div className="space-y-3">
            {parsedArticle.outline.map((item, index) => (
              <div
                key={index}
                className="p-4 bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 bg-[#FF2442] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {item.pageNumber}
                    </span>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        autoFocus
                        className="flex-1 px-2 py-1 border border-[#FF2442] rounded-lg outline-none font-bold"
                      />
                    ) : (
                      <span
                        className="font-bold cursor-pointer hover:text-[#FF2442]"
                        onClick={() => setEditingIndex(index)}
                      >
                        {item.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className="p-2 text-gray-400 hover:text-[#FF2442] hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <RiEditLine />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <RiDeleteBinLine />
                    </button>
                  </div>
                </div>

                {editingIndex === index && (
                  <div className="mt-3 space-y-3 pl-11">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">内容</label>
                      <textarea
                        value={item.content}
                        onChange={(e) => handleUpdateItem(index, 'content', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#FF2442] resize-none"
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">图片提示词（英文）</label>
                      <textarea
                        value={item.imagePrompt}
                        onChange={(e) => handleUpdateItem(index, 'imagePrompt', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#FF2442] resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {editingIndex !== index && (
                  <p className="mt-2 pl-11 text-sm text-gray-600 line-clamp-2">
                    {item.content}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 添加页按钮 */}
          <button
            onClick={handleAddItem}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-[#FF2442] hover:text-[#FF2442] transition-colors flex items-center justify-center gap-2"
          >
            <RiAddLine />
            添加新页
          </button>
        </div>
      )}
    </div>
  );
}
