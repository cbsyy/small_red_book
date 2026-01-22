'use client';

import { useState, useEffect } from 'react';
import { RiLoader4Line, RiCheckLine, RiArrowLeftLine, RiRefreshLine, RiEditLine, RiFileCopyLine, RiRobot2Line } from 'react-icons/ri';
import { useCreationStore } from '@/store/useCreationStore';

// AI Profile 类型
interface AIProfile {
  id: string;
  name: string;
  textModel: string;
  imageModel: string;
  enabled: boolean;
}

export default function DraftingStep() {
  const {
    finalCopy,
    isGeneratingCopy,
    outline,
    originalText,
    originalTitle,
    generationMode,
    setFinalCopy,
    setIsGeneratingCopy,
    setStep,
    setError,
    selectedProfileId,
    setSelectedProfileId,
    vibe,
  } = useCreationStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedCopy, setEditedCopy] = useState(finalCopy);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // 获取 AI Profile 列表
  useEffect(() => {
    fetchProfiles();
  }, []);

  // 同步 editedCopy
  useEffect(() => {
    setEditedCopy(finalCopy);
  }, [finalCopy]);

  // 快速模式：自动生成文案
  useEffect(() => {
    if (generationMode === 'quick' && !finalCopy && !isGeneratingCopy && originalText) {
      handleGenerateCopy();
    }
  }, [generationMode, originalText]);

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

  // 生成文案（快速模式直接用原文，标准模式用大纲）
  const handleGenerateCopy = async () => {
    setIsGeneratingCopy(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/copywriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 快速模式传递原文，标准模式传递大纲
          outline: generationMode === 'quick' ? null : outline,
          originalText: generationMode === 'quick' ? originalText : null,
          originalTitle: generationMode === 'quick' ? originalTitle : null,
          profileId: selectedProfileId,
          vibe,
          mode: generationMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成文案失败');

      const copyContent = data.data?.copy || data.copy || '';
      setFinalCopy(copyContent);
      setEditedCopy(copyContent);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleConfirmEdit = () => {
    setFinalCopy(editedCopy);
    setIsEditing(false);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/copywriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline: generationMode === 'quick' ? null : outline,
          originalText: generationMode === 'quick' ? originalText : null,
          originalTitle: generationMode === 'quick' ? originalTitle : null,
          profileId: selectedProfileId,
          vibe,
          mode: generationMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '重新生成失败');

      const copyContent = data.data?.copy || data.copy || '';
      setFinalCopy(copyContent);
      setEditedCopy(copyContent);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(finalCopy || '');
      // 可以添加 toast 提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 直接进入图片生成步骤（不再调用无效的 image-prompt API）
  const handleProceedToVisual = () => {
    if (!finalCopy?.trim()) {
      setError('请先确认文案内容');
      return;
    }
    setStep('visual');
  };

  const handleBack = () => {
    if (generationMode === 'quick') {
      setStep('configure');
    } else {
      setStep('outline');
    }
  };

  if (isGeneratingCopy) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RiLoader4Line className="text-4xl text-[#FF2442] animate-spin mb-4" />
        <p className="text-gray-600 font-medium">正在生成小红书文案...</p>
        <p className="text-gray-400 text-sm mt-2">
          {generationMode === 'quick' ? '快速模式：基于原文直接生成' : '标准模式：基于大纲生成'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 模式提示 */}
      {generationMode === 'quick' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-700 text-sm">
            快速模式：跳过大纲，直接基于原文生成小红书文案
          </span>
        </div>
      )}

      {/* 模型选择 */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <RiRobot2Line className="text-[#FF2442]" />
          当前使用的 AI 模型
        </label>
        <div className="flex items-center gap-3">
          <select
            value={selectedProfileId || ''}
            onChange={(e) => setSelectedProfileId(e.target.value || null)}
            disabled={isLoadingProfiles}
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
            onClick={handleRegenerate}
            disabled={!selectedProfileId || isRegenerating}
            className="px-4 py-2 bg-[#FF2442] text-white rounded-lg text-sm font-medium hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            <RiRefreshLine className={isRegenerating ? 'animate-spin' : ''} />
            重新生成
          </button>
        </div>
      </div>

      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">小红书文案</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyToClipboard}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
          >
            <RiFileCopyLine /> 复制
          </button>
          <button
            onClick={() => {
              setEditedCopy(finalCopy);
              setIsEditing(!isEditing);
            }}
            className="px-3 py-1.5 text-sm text-[#FF2442] hover:bg-[#FF2442]/10 rounded-lg transition-colors flex items-center gap-1"
          >
            <RiEditLine /> {isEditing ? '取消' : '编辑'}
          </button>
        </div>
      </div>

      {/* 文案内容 */}
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editedCopy}
            onChange={(e) => setEditedCopy(e.target.value)}
            className="w-full h-[400px] px-4 py-3 border border-[#FF2442] rounded-xl focus:ring-2 focus:ring-[#FF2442]/10 outline-none resize-none text-sm leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmEdit}
              className="px-4 py-2 bg-[#FF2442] text-white rounded-lg hover:bg-[#E61E3B] transition-colors"
            >
              确认修改
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full min-h-[400px] px-5 py-4 bg-gradient-to-br from-pink-50 to-orange-50 border border-pink-100 rounded-xl">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">{finalCopy || ''}</pre>
          </div>
        </div>
      )}

      {/* 字数统计 */}
      <div className="text-right text-sm text-gray-500">
        共 {finalCopy?.length || 0} 字
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <button
          onClick={handleBack}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-all flex items-center gap-2"
        >
          <RiArrowLeftLine /> {generationMode === 'quick' ? '返回配置' : '返回修改大纲'}
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
            onClick={handleProceedToVisual}
            disabled={!finalCopy?.trim() || !selectedProfileId}
            className="px-6 py-3 bg-[#FF2442] text-white rounded-xl font-semibold hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <RiCheckLine /> 确认文案，生成图片
          </button>
        </div>
      </div>
    </div>
  );
}
