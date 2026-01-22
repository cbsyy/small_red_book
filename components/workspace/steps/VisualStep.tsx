'use client';

import { useState, useEffect } from 'react';
import { RiLoader4Line, RiImageLine, RiEditLine, RiArrowLeftLine, RiDownloadLine, RiRefreshLine, RiRobot2Line, RiCheckLine, RiMagicLine, RiSettings4Line, RiCloseLine } from 'react-icons/ri';
import { useCreationStore } from '@/store/useCreationStore';
import StyleSelector from '../StyleSelector';

// AI Profile 类型
interface AIProfile {
  id: string;
  name: string;
  kind: string;
  model: string;
  enabled: boolean;
}

// 扩展的图片项
interface ImageItem {
  id: string;
  pageNumber: number;
  title: string;
  content: string;
  imagePrompt: string;
  imageUrl: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
  customAdjustment?: string;  // 单张图片的微调说明
}

export default function VisualStep() {
  const {
    outline,
    quickPrompts,
    generationMode,
    isGeneratingImages,
    setIsGeneratingImages,
    setStep,
    setError,
    reset,
    selectedProfileId,
    setSelectedProfileId,
    selectedImagePromptId,
  } = useCreationStore();

  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // 新增：图像提示词生成状态
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [promptsGenerated, setPromptsGenerated] = useState(false);

  // 风格选择状态
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [customStylePrompt, setCustomStylePrompt] = useState('');

  // 单张微调状态
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [itemAdjustmentText, setItemAdjustmentText] = useState('');

  // 获取 AI Profile 列表
  useEffect(() => {
    fetchProfiles();
  }, []);

  // 初始化：根据模式决定数据来源
  useEffect(() => {
    if (promptsGenerated || imageItems.length > 0) return;

    if (generationMode === 'quick' && quickPrompts.length > 0) {
      // 快速模式：直接使用已生成的 quickPrompts
      initializeFromQuickPrompts();
    } else if (generationMode === 'standard' && outline.length > 0 && selectedProfileId) {
      // 标准模式：需要先生成图像提示词
      generateImagePromptsForOutline();
    }
  }, [generationMode, outline, quickPrompts, selectedProfileId, promptsGenerated]);

  // 快速模式：从 quickPrompts 初始化
  const initializeFromQuickPrompts = () => {
    const items: ImageItem[] = quickPrompts.map((p, idx) => ({
      id: p.id,
      pageNumber: idx + 1,
      title: p.angleDescription || p.angle,
      content: p.contentBasis || '',
      imagePrompt: p.prompt,
      imageUrl: '',
      status: 'pending',
    }));
    setImageItems(items);
    setPromptsGenerated(true);
  };

  // 标准模式：调用专业 API 生成图像提示词
  const generateImagePromptsForOutline = async (itemAdjustments: Record<string, string> = {}) => {
    if (!selectedProfileId) {
      setError('请先选择 AI 模型配置');
      return;
    }

    setIsGeneratingPrompts(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/generate-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlineItems: outline.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,
          })),
          imagePromptId: selectedImagePromptId,
          profileId: selectedProfileId,
          styleIds: selectedStyles,
          customStylePrompt: customStylePrompt,
          itemAdjustments: itemAdjustments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成图像提示词失败');

      // 将生成的提示词与大纲合并
      const promptsMap = new Map(
        data.data.prompts.map((p: { id: string; imagePrompt: string }) => [p.id, p.imagePrompt])
      );

      const items: ImageItem[] = outline.map((item, idx) => ({
        id: item.id,
        pageNumber: item.pageNumber,
        title: item.title,
        content: item.content,
        imagePrompt: promptsMap.get(item.id) || `Clean minimalist infographic about "${item.title}". Soft pastel colors, rounded corners, cute icons.`,
        imageUrl: '',
        status: 'pending',
      }));

      setImageItems(items);
      setPromptsGenerated(true);
    } catch (err: any) {
      setError(err.message);
      // 失败时使用默认提示词
      const items: ImageItem[] = outline.map((item, idx) => ({
        id: item.id,
        pageNumber: item.pageNumber,
        title: item.title,
        content: item.content,
        imagePrompt: `Clean minimalist infographic about "${item.title}". Soft pastel colors, information visualization, rounded corners, cute icons. No text, no logos.`,
        imageUrl: '',
        status: 'pending',
      }));
      setImageItems(items);
      setPromptsGenerated(true);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const fetchProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const res = await fetch('/api/ai-profile');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProfiles(data.data.filter((p: AIProfile) => p.enabled));
      }
    } catch (err) {
      console.error('获取 AI Profile 列表失败:', err);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  // 生成单张图片
  const handleGenerateSingleImage = async (itemId: string) => {
    if (!selectedProfileId) {
      setError('请选择 AI 模型配置');
      return;
    }

    const item = imageItems.find(i => i.id === itemId);
    if (!item) return;

    setGeneratingIds(prev => new Set(prev).add(itemId));
    setImageItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, status: 'generating', error: undefined } : i
    ));

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: item.imagePrompt,
          profileId: selectedProfileId,
          // 不再追加风格，因为提示词生成时已经包含了风格
          enhanceWithStyle: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成图片失败');

      const imageUrl = data.data?.imageUrl || data.imageUrl || '';
      setImageItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, status: 'completed', imageUrl } : i
      ));
    } catch (err: any) {
      setImageItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, status: 'error', error: err.message } : i
      ));
    } finally {
      setGeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // 批量生成所有图片
  const handleGenerateAllImages = async () => {
    if (!selectedProfileId) {
      setError('请选择 AI 模型配置');
      return;
    }

    setIsGeneratingImages(true);

    const pendingItems = imageItems.filter(i => i.status === 'pending' || i.status === 'error');

    for (const item of pendingItems) {
      await handleGenerateSingleImage(item.id);
    }

    setIsGeneratingImages(false);
  };

  // 重新生成图像提示词（全部）
  const handleRegeneratePrompts = () => {
    // 如果没有选择风格也没有补充说明，提示用户
    if (selectedStyles.length === 0 && !customStylePrompt.trim()) {
      const confirmed = window.confirm('您还没有选择风格或添加补充说明，重新生成的结果可能与之前相同。\n\n建议先选择一些风格标签或填写补充说明，再重新生成。\n\n是否继续？');
      if (!confirmed) return;
    }

    setPromptsGenerated(false);
    setImageItems([]);
    if (generationMode === 'standard') {
      generateImagePromptsForOutline();
    } else {
      // 快速模式也调用 API，带上风格参数
      regenerateQuickModePrompts();
    }
  };

  // 快速模式重新生成提示词
  const regenerateQuickModePrompts = async () => {
    setIsGeneratingPrompts(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/generate-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlineItems: quickPrompts.map((p, idx) => ({
            id: p.id,
            title: p.angleDescription || p.angle,
            content: p.contentBasis || '',
          })),
          profileId: selectedProfileId,
          styleIds: selectedStyles,
          customStylePrompt: customStylePrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成图像提示词失败');

      const promptsMap = new Map(
        data.data.prompts.map((p: { id: string; imagePrompt: string }) => [p.id, p.imagePrompt])
      );

      const items: ImageItem[] = quickPrompts.map((p, idx) => ({
        id: p.id,
        pageNumber: idx + 1,
        title: p.angleDescription || p.angle,
        content: p.contentBasis || '',
        imagePrompt: promptsMap.get(p.id) || p.prompt,
        imageUrl: '',
        status: 'pending',
      }));

      setImageItems(items);
      setPromptsGenerated(true);
    } catch (err: any) {
      setError(err.message);
      // 失败时使用原始提示词
      initializeFromQuickPrompts();
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  // 重新生成单张图片的提示词（带微调说明）
  const handleRegenerateSinglePrompt = async (itemId: string, adjustment: string) => {
    const item = imageItems.find(i => i.id === itemId);
    if (!item) return;

    setIsGeneratingPrompts(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/generate-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlineItems: [{
            id: item.id,
            title: item.title,
            content: item.content,
          }],
          profileId: selectedProfileId,
          styleIds: selectedStyles,
          customStylePrompt: customStylePrompt,
          itemAdjustments: { [itemId]: adjustment },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成图像提示词失败');

      const newPrompt = data.data.prompts[0]?.imagePrompt;
      if (newPrompt) {
        setImageItems(prev => prev.map(i =>
          i.id === itemId ? { ...i, imagePrompt: newPrompt, customAdjustment: adjustment, status: 'pending' } : i
        ));
      }

      setAdjustingItemId(null);
      setItemAdjustmentText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  // 更新提示词
  const handleUpdatePrompt = (itemId: string) => {
    setImageItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, imagePrompt: editedPrompt } : i
    ));
    setEditingPromptId(null);
    setEditedPrompt('');
  };

  // 下载图片
  const handleDownloadImage = async (url: string, pageNumber: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `xiaohongshu-page-${pageNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('下载失败:', err);
    }
  };

  // 下载所有图片
  const handleDownloadAll = async () => {
    const completedImages = imageItems.filter(i => i.status === 'completed' && i.imageUrl);
    for (const img of completedImages) {
      await handleDownloadImage(img.imageUrl, img.pageNumber);
    }
  };

  const handleBack = () => {
    setStep('drafting');
  };

  const handleFinish = () => {
    reset();
  };

  const completedCount = imageItems.filter(i => i.status === 'completed').length;
  const totalCount = imageItems.length;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  // 图像模型列表（过滤 image 和 universal 类型）
  const imageProfiles = profiles.filter(p => p.kind === 'image' || p.kind === 'universal');

  // 生成提示词中的加载状态
  if (isGeneratingPrompts) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RiMagicLine className="text-4xl text-[#FF2442] animate-pulse mb-4" />
        <p className="text-gray-600 font-medium">正在为每页内容生成专业图像描述...</p>
        <p className="text-gray-400 text-sm mt-2">这可能需要一点时间，请耐心等待</p>
      </div>
    );
  }

  // 未选择模型时提示
  if (!selectedProfileId && generationMode === 'standard' && !promptsGenerated) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RiRobot2Line className="text-4xl text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium mb-4">请先选择 AI 模型以生成图像提示词</p>
        <select
          value={selectedProfileId || ''}
          onChange={(e) => setSelectedProfileId(e.target.value || null)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:border-[#FF2442] outline-none text-sm"
        >
          <option value="">请选择模型</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} - {profile.model}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 模式提示 */}
      {generationMode === 'quick' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-700 text-sm">
            快速模式：使用预生成的图像提示词
          </span>
        </div>
      )}

      {/* 模型选择 */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <RiRobot2Line className="text-[#FF2442]" />
          图像生成模型
        </label>
        <div className="flex items-center gap-3">
          <select
            value={selectedProfileId || ''}
            onChange={(e) => setSelectedProfileId(e.target.value || null)}
            disabled={isLoadingProfiles}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg bg-white focus:border-[#FF2442] outline-none text-sm"
          >
            <option value="">请选择模型</option>
            {imageProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} - {profile.model}
              </option>
            ))}
          </select>
          <button
            onClick={handleRegeneratePrompts}
            disabled={isGeneratingPrompts || !selectedProfileId}
            className="px-4 py-2 text-[#FF2442] border border-[#FF2442] rounded-lg text-sm font-medium hover:bg-[#FF2442]/10 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            <RiMagicLine className={isGeneratingPrompts ? 'animate-spin' : ''} />
            重新生成提示词
          </button>
          <button
            onClick={handleGenerateAllImages}
            disabled={isGeneratingImages || !selectedProfileId || allCompleted}
            className="px-4 py-2 bg-[#FF2442] text-white rounded-lg text-sm font-medium hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {isGeneratingImages ? (
              <>
                <RiLoader4Line className="animate-spin" /> 生成中...
              </>
            ) : (
              <>
                <RiImageLine /> 一键生成全部
              </>
            )}
          </button>
        </div>
      </div>

      {/* 风格选择 */}
      <StyleSelector
        selectedStyles={selectedStyles}
        onStyleChange={setSelectedStyles}
        customPrompt={customStylePrompt}
        onCustomPromptChange={setCustomStylePrompt}
        disabled={isGeneratingPrompts || isGeneratingImages}
      />

      {/* 进度提示 */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-blue-700 text-sm">
            共 {totalCount} 张图片，已生成 {completedCount} 张
          </span>
          {allCompleted && (
            <button
              onClick={handleDownloadAll}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RiDownloadLine /> 下载全部
            </button>
          )}
        </div>
        <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 图片列表 */}
      <div className="space-y-4">
        {imageItems.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 transition-colors"
          >
            <div className="flex gap-4">
              {/* 页码 */}
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-lg flex items-center justify-center font-bold">
                {item.pageNumber}
              </div>

              {/* 内容区域 */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 mb-1 truncate">{item.title}</h4>
                {item.content && (
                  <p className="text-xs text-gray-400 mb-2 line-clamp-1">{item.content}</p>
                )}

                {/* 提示词编辑 */}
                {editingPromptId === item.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none resize-none text-sm"
                      placeholder="输入图片提示词..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingPromptId(null)}
                        className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleUpdatePrompt(item.id)}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                ) : adjustingItemId === item.id ? (
                  /* 单张微调输入 */
                  <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-800">🎯 微调提示词</span>
                      <button
                        onClick={() => {
                          setAdjustingItemId(null);
                          setItemAdjustmentText('');
                        }}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        <RiCloseLine />
                      </button>
                    </div>
                    <textarea
                      value={itemAdjustmentText}
                      onChange={(e) => setItemAdjustmentText(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-200 outline-none resize-none text-sm"
                      placeholder="告诉 AI 你希望这张图如何调整，如：我希望背景更暗一些，加入一些星空元素..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setAdjustingItemId(null);
                          setItemAdjustmentText('');
                        }}
                        className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleRegenerateSinglePrompt(item.id, itemAdjustmentText)}
                        disabled={!itemAdjustmentText.trim() || isGeneratingPrompts}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:bg-gray-300 flex items-center gap-1"
                      >
                        {isGeneratingPrompts ? <RiLoader4Line className="animate-spin" /> : <RiMagicLine />}
                        重新生成
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <p className="text-gray-600 text-sm flex-1 line-clamp-2">{item.imagePrompt}</p>
                      <button
                        onClick={() => {
                          setEditingPromptId(item.id);
                          setEditedPrompt(item.imagePrompt);
                        }}
                        className="flex-shrink-0 text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1"
                        title="编辑提示词"
                      >
                        <RiEditLine />
                      </button>
                    </div>
                    {/* 微调按钮 */}
                    <button
                      onClick={() => {
                        setAdjustingItemId(item.id);
                        setItemAdjustmentText(item.customAdjustment || '');
                      }}
                      disabled={isGeneratingPrompts}
                      className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      <RiSettings4Line /> 微调这张图
                    </button>
                    {item.customAdjustment && (
                      <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        已微调：{item.customAdjustment}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 图片预览/状态 */}
              <div className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg overflow-hidden relative">
                {item.status === 'pending' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <RiImageLine className="text-2xl mb-1" />
                    <span className="text-xs">待生成</span>
                  </div>
                )}
                {item.status === 'generating' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-50">
                    <RiLoader4Line className="text-2xl text-purple-500 animate-spin mb-1" />
                    <span className="text-xs text-purple-600">生成中...</span>
                  </div>
                )}
                {item.status === 'completed' && item.imageUrl && (
                  <>
                    <img
                      src={item.imageUrl}
                      alt={`第${item.pageNumber}页配图`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <button
                        onClick={() => handleDownloadImage(item.imageUrl, item.pageNumber)}
                        className="p-2 bg-white/90 rounded-lg text-gray-800 hover:bg-white"
                      >
                        <RiDownloadLine />
                      </button>
                    </div>
                  </>
                )}
                {item.status === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 p-2">
                    <span className="text-red-500 text-xs text-center mb-1">{item.error || '失败'}</span>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex-shrink-0 flex flex-col justify-center gap-2">
                <button
                  onClick={() => handleGenerateSingleImage(item.id)}
                  disabled={generatingIds.has(item.id) || !selectedProfileId}
                  className="px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {generatingIds.has(item.id) ? (
                    <RiLoader4Line className="animate-spin" />
                  ) : item.status === 'completed' ? (
                    <RiRefreshLine />
                  ) : (
                    <RiImageLine />
                  )}
                  {item.status === 'completed' ? '重新生成' : '生成'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <button
          onClick={handleBack}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-all flex items-center gap-2"
        >
          <RiArrowLeftLine /> 返回修改文案
        </button>
        <button
          onClick={handleFinish}
          disabled={!allCompleted}
          className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <RiCheckLine /> 完成创作
        </button>
      </div>
    </div>
  );
}
