'use client';

import { useState, useEffect } from 'react';
import { RiAddLine, RiDeleteBinLine, RiArrowUpLine, RiArrowDownLine, RiLoader4Line, RiCheckLine, RiArrowLeftLine, RiRefreshLine, RiRobot2Line } from 'react-icons/ri';
import { useCreationStore, type OutlineItem } from '@/store/useCreationStore';

// AI Profile 类型
interface AIProfile {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  textModel: string;
  imageModel: string;
  isDefault: boolean;
  enabled: boolean;
}

export default function OutlineStep() {
  const {
    outline,
    isGeneratingOutline,
    setOutline,
    updateOutlineItem,
    addOutlineItem,
    removeOutlineItem,
    setStep,
    setFinalCopy,
    setIsGeneratingCopy,
    setIsGeneratingOutline,
    setError,
    originalText,
    originalTitle,
    vibe,
    selectedProfileId,
    setSelectedProfileId,
    selectedTextPromptId,
  } = useCreationStore();

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // 获取 AI Profile 列表
  useEffect(() => {
    fetchProfiles();
  }, []);

  // 自动生成大纲（首次进入且大纲为空时）
  useEffect(() => {
    if (outline.length === 0 && originalText && selectedProfileId && !isRegenerating && !isGeneratingOutline) {
      handleGenerateOutline();
    }
  }, [selectedProfileId]);

  const fetchProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const res = await fetch('/api/ai-profile');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const enabledProfiles = data.data.filter((p: AIProfile) => p.enabled);
        setProfiles(enabledProfiles);
      }
    } catch (err) {
      console.error('获取 AI Profile 列表失败:', err);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  // 生成大纲
  const handleGenerateOutline = async () => {
    if (!originalText.trim()) {
      setError('没有原始内容，无法生成大纲');
      return;
    }

    if (!selectedProfileId) {
      setError('请先选择 AI 模型配置');
      return;
    }

    setIsRegenerating(true);
    setIsGeneratingOutline(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: originalText,
          title: originalTitle,
          profileId: selectedProfileId,
          textPromptId: selectedTextPromptId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成大纲失败');

      // 转换为带 id 的格式
      const newOutline = (data.data?.outline || data.outline || []).map((item: any, index: number) => ({
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        pageNumber: index + 1,
        title: item.title || '',
        content: item.content || '',
        imagePrompt: item.imagePrompt || '',
      }));

      setOutline(newOutline);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRegenerating(false);
      setIsGeneratingOutline(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOutline = [...outline];
    [newOutline[index - 1], newOutline[index]] = [newOutline[index], newOutline[index - 1]];
    // 重新编号
    setOutline(newOutline.map((item, i) => ({ ...item, pageNumber: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === outline.length - 1) return;
    const newOutline = [...outline];
    [newOutline[index], newOutline[index + 1]] = [newOutline[index + 1], newOutline[index]];
    setOutline(newOutline.map((item, i) => ({ ...item, pageNumber: i + 1 })));
  };

  const handleProceedToDrafting = async () => {
    if (outline.length === 0) {
      setError('请至少添加一个大纲项');
      return;
    }

    setIsGeneratingCopy(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/copywriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline,
          profileId: selectedProfileId,
          vibe,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成文案失败');

      // API 返回格式是 { success: true, data: { copy: ... } }
      const copyContent = data.data?.copy || data.copy || '';
      if (!copyContent) {
        throw new Error('AI 返回的文案内容为空');
      }
      setFinalCopy(copyContent);
      setStep('drafting');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  if (isGeneratingOutline || isRegenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RiLoader4Line className="text-4xl text-[#FF2442] animate-spin mb-4" />
        <p className="text-gray-600 font-medium">正在生成大纲...</p>
        <p className="text-gray-400 text-sm mt-2">使用模型: {profiles.find(p => p.id === selectedProfileId)?.name || '...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 模型选择 */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <RiRobot2Line className="text-[#FF2442]" />
          当前使用的 AI 模型
        </label>
        {isLoadingProfiles ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <RiLoader4Line className="animate-spin" />
            加载中...
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <select
              value={selectedProfileId || ''}
              onChange={(e) => setSelectedProfileId(e.target.value || null)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg bg-white focus:border-[#FF2442] outline-none text-sm"
            >
              <option value="">请选择模型</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} - {profile.textModel}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerateOutline}
              disabled={!selectedProfileId || isRegenerating}
              className="px-4 py-2 bg-[#FF2442] text-white rounded-lg text-sm font-medium hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RiRefreshLine className={isRegenerating ? 'animate-spin' : ''} />
              {outline.length > 0 ? '重新生成' : '生成大纲'}
            </button>
          </div>
        )}
      </div>

      {/* 提示 */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm">
        你可以自由编辑、添加、删除或调整大纲顺序。每个大纲项将生成一页小红书卡片。
      </div>

      {/* 大纲列表 */}
      <div className="space-y-4">
        {outline.map((item, index) => (
          <div
            key={item.id}
            className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-[#FF2442]/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* 页码 */}
              <div className="flex-shrink-0 w-8 h-8 bg-[#FF2442] text-white rounded-lg flex items-center justify-center font-bold text-sm">
                {item.pageNumber}
              </div>

              {/* 内容编辑 */}
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateOutlineItem(item.id, { title: e.target.value })}
                  placeholder="章节标题..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#FF2442] outline-none text-sm font-semibold"
                />
                <textarea
                  value={item.content}
                  onChange={(e) => updateOutlineItem(item.id, { content: e.target.value })}
                  placeholder="章节内容..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#FF2442] outline-none text-sm resize-none"
                />
                <input
                  type="text"
                  value={item.imagePrompt}
                  onChange={(e) => updateOutlineItem(item.id, { imagePrompt: e.target.value })}
                  placeholder="图片提示词（可选，稍后可修改）..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#FF2442] outline-none text-sm text-gray-600"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <RiArrowUpLine />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === outline.length - 1}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <RiArrowDownLine />
                </button>
                <button
                  onClick={() => removeOutlineItem(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                >
                  <RiDeleteBinLine />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <button
        onClick={addOutlineItem}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#FF2442] hover:text-[#FF2442] transition-colors flex items-center justify-center gap-2"
      >
        <RiAddLine /> 添加一页
      </button>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <button
          onClick={() => setStep('parsing')}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-all flex items-center gap-2"
        >
          <RiArrowLeftLine /> 返回上一步
        </button>
        <div className="flex items-center gap-3">
          <select
            value={selectedProfileId || ''}
            onChange={(e) => setSelectedProfileId(e.target.value || null)}
            className="px-4 py-3 border border-gray-200 rounded-xl bg-white focus:border-[#FF2442] outline-none text-sm"
          >
            <option value="">选择模型</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleProceedToDrafting}
            disabled={outline.length === 0 || !selectedProfileId}
            className="px-6 py-3 bg-[#FF2442] text-white rounded-xl font-semibold hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <RiCheckLine /> 确认大纲，生成文案
          </button>
        </div>
      </div>
    </div>
  );
}
