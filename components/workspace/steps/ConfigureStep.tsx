'use client';

import { useState, useEffect } from 'react';
import { RiFileTextLine, RiImageLine, RiLoader4Line, RiEditLine, RiCheckLine, RiSettings3Line } from 'react-icons/ri';
import { useCreationStore, type ImageCountOption, type QuickPrompt } from '@/store/useCreationStore';
import Link from 'next/link';

interface AIProfile {
  id: string;
  name: string;
  kind: string;
  model: string;
  isDefault: boolean;
  enabled: boolean;
}

interface PromptConfig {
  id: string;
  name: string;
  kind: string;
  isDefault: boolean;
  enabled: boolean;
}

export default function ConfigureStep() {
  const {
    originalText,
    originalTitle,
    generationMode,
    imageCount,
    quickPrompts,
    isGeneratingQuickPrompts,
    selectedProfileId,
    selectedTextPromptId,
    selectedImagePromptId,
    setGenerationMode,
    setImageCount,
    setQuickPrompts,
    updateQuickPrompt,
    setIsGeneratingQuickPrompts,
    setSelectedProfileId,
    setSelectedTextPromptId,
    setSelectedImagePromptId,
    setStep,
    setError,
  } = useCreationStore();

  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [textPrompts, setTextPrompts] = useState<PromptConfig[]>([]);
  const [imagePrompts, setImagePrompts] = useState<PromptConfig[]>([]);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // 加载 AI Profiles
  useEffect(() => {
    fetch('/api/ai-profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const enabledProfiles = data.data.filter((p: AIProfile) => p.enabled);
          setProfiles(enabledProfiles);
          // 如果没有选中的，选择默认的或第一个
          if (!selectedProfileId) {
            const defaultProfile = enabledProfiles.find((p: AIProfile) => p.isDefault && (p.kind === 'text' || p.kind === 'universal'));
            const firstTextProfile = enabledProfiles.find((p: AIProfile) => p.kind === 'text' || p.kind === 'universal');
            if (defaultProfile) {
              setSelectedProfileId(defaultProfile.id);
            } else if (firstTextProfile) {
              setSelectedProfileId(firstTextProfile.id);
            }
          }
        }
      })
      .catch(console.error);
  }, [selectedProfileId, setSelectedProfileId]);

  // 加载 Prompt 配置
  useEffect(() => {
    fetch('/api/prompt-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const enabledPrompts = data.data.filter((p: PromptConfig) => p.enabled);
          setTextPrompts(enabledPrompts.filter((p: PromptConfig) => p.kind === 'text'));
          setImagePrompts(enabledPrompts.filter((p: PromptConfig) => p.kind === 'image'));

          // 自动选择默认的文本 Prompt
          if (!selectedTextPromptId) {
            const defaultText = enabledPrompts.find((p: PromptConfig) => p.kind === 'text' && p.isDefault);
            if (defaultText) {
              setSelectedTextPromptId(defaultText.id);
            }
          }

          // 自动选择默认的图像 Prompt
          if (!selectedImagePromptId) {
            const defaultImage = enabledPrompts.find((p: PromptConfig) => p.kind === 'image' && p.isDefault);
            if (defaultImage) {
              setSelectedImagePromptId(defaultImage.id);
            }
          }
        }
      })
      .catch(console.error);
  }, [selectedTextPromptId, selectedImagePromptId, setSelectedTextPromptId, setSelectedImagePromptId]);

  // 当切换到快速模式且没有提示词时，自动生成
  useEffect(() => {
    if (generationMode === 'quick' && quickPrompts.length === 0 && !isGeneratingQuickPrompts) {
      generateQuickPrompts();
    }
  }, [generationMode, imageCount]);

  // 生成快速模式提示词
  const generateQuickPrompts = async () => {
    if (!originalText) return;

    setIsGeneratingQuickPrompts(true);
    try {
      const res = await fetch('/api/workflow/quick-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: originalText,
          title: originalTitle,
          count: imageCount,
          profileId: selectedProfileId,
          imagePromptId: selectedImagePromptId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQuickPrompts(data.data.prompts);
      } else {
        setError(data.error || '生成提示词失败');
      }
    } catch (error: any) {
      setError(error.message || '生成提示词失败');
    } finally {
      setIsGeneratingQuickPrompts(false);
    }
  };

  // 图片数量变更时重新生成
  const handleImageCountChange = (count: ImageCountOption) => {
    setImageCount(count);
    if (generationMode === 'quick') {
      setQuickPrompts([]);
    }
  };

  // 开始编辑提示词
  const startEditPrompt = (prompt: QuickPrompt) => {
    setEditingPromptId(prompt.id);
    setEditValue(prompt.prompt);
  };

  // 保存编辑
  const saveEditPrompt = () => {
    if (editingPromptId) {
      updateQuickPrompt(editingPromptId, { prompt: editValue });
      setEditingPromptId(null);
      setEditValue('');
    }
  };

  // 确认并继续
  const handleConfirm = () => {
    if (generationMode === 'standard') {
      setStep('outline');
    } else {
      // 快速模式：跳过大纲，直接生成文案
      setStep('drafting');
    }
  };

  const imageCountOptions: ImageCountOption[] = [1, 3, 6, 9];
  const textProfiles = profiles.filter((p) => p.kind === 'text' || p.kind === 'universal');

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-xl">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">选择生成模式</h2>
          <p className="text-gray-500">根据您的需求选择合适的创作方式</p>
        </div>

        {/* 模式选择 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* 标准模式 */}
          <button
            onClick={() => setGenerationMode('standard')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              generationMode === 'standard'
                ? 'border-[#FF2442] bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
              generationMode === 'standard' ? 'bg-[#FF2442] text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              <RiFileTextLine className="text-2xl" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">大纲模式</h3>
            <p className="text-sm text-gray-500">
              适合长文重写、深度创作。先生成大纲，再生成文案和配图。
            </p>
            {generationMode === 'standard' && (
              <span className="inline-block mt-3 text-xs font-semibold text-[#FF2442] bg-red-100 px-2 py-1 rounded">
                默认推荐
              </span>
            )}
          </button>

          {/* 快速模式 */}
          <button
            onClick={() => setGenerationMode('quick')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              generationMode === 'quick'
                ? 'border-[#FF2442] bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
              generationMode === 'quick' ? 'bg-[#FF2442] text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              <RiImageLine className="text-2xl" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">快速模式</h3>
            <p className="text-sm text-gray-500">
              跳过大纲，直接生成文案和信息图。适合快速出图。
            </p>
          </button>
        </div>

        {/* 图片数量选择 - 仅快速模式显示 */}
        {generationMode === 'quick' && (
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              生成图片数量
            </label>
            <div className="flex gap-3">
              {imageCountOptions.map((count) => (
                <button
                  key={count}
                  onClick={() => handleImageCountChange(count)}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    imageCount === count
                      ? 'bg-[#FF2442] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {count} 张
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 快速模式提示词预览 */}
        {generationMode === 'quick' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                图片提示词预览
              </label>
              {!isGeneratingQuickPrompts && quickPrompts.length > 0 && (
                <button
                  onClick={generateQuickPrompts}
                  className="text-sm text-[#FF2442] hover:underline"
                >
                  重新生成
                </button>
              )}
            </div>

            {isGeneratingQuickPrompts ? (
              <div className="flex items-center justify-center py-12 bg-gray-50 rounded-xl">
                <RiLoader4Line className="animate-spin text-2xl text-[#FF2442] mr-2" />
                <span className="text-gray-500">AI 正在分析内容并生成提示词...</span>
              </div>
            ) : quickPrompts.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {quickPrompts.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    className="p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-[#FF2442] bg-red-100 px-2 py-0.5 rounded">
                          {index + 1}. {prompt.angleDescription || prompt.angle}
                        </span>
                        {prompt.edited && (
                          <span className="ml-2 text-xs text-gray-400">已编辑</span>
                        )}
                      </div>
                      {editingPromptId === prompt.id ? (
                        <button
                          onClick={saveEditPrompt}
                          className="text-green-500 hover:text-green-600"
                        >
                          <RiCheckLine />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditPrompt(prompt)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <RiEditLine />
                        </button>
                      )}
                    </div>

                    {editingPromptId === prompt.id ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#FF2442]/20"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {prompt.prompt}
                      </p>
                    )}

                    {prompt.contentBasis && (
                      <p className="text-xs text-gray-400 mt-2">
                        基于: {prompt.contentBasis}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400">
                点击下方按钮生成提示词
              </div>
            )}
          </div>
        )}

        {/* AI 配置区域 */}
        <div className="mb-8 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">AI 配置</h4>
            <Link
              href="/admin/settings"
              className="text-xs text-gray-400 hover:text-[#FF2442] flex items-center gap-1"
            >
              <RiSettings3Line />
              管理配置
            </Link>
          </div>

          <div className="space-y-4">
            {/* 文本模型选择 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">文本模型</label>
              <select
                value={selectedProfileId || ''}
                onChange={(e) => setSelectedProfileId(e.target.value || null)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2442]/20 text-sm"
              >
                <option value="">选择模型...</option>
                {textProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ({profile.model})
                  </option>
                ))}
              </select>
              {textProfiles.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">暂无可用的文本模型，请先在配置管理中添加</p>
              )}
            </div>

            {/* 文本 Prompt 选择 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">文本 Prompt</label>
              <select
                value={selectedTextPromptId || ''}
                onChange={(e) => setSelectedTextPromptId(e.target.value || null)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2442]/20 text-sm"
              >
                <option value="" disabled>选择文本 Prompt...</option>
                {textPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name} {prompt.isDefault && '(默认)'}
                  </option>
                ))}
              </select>
              {textPrompts.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">暂无可用的文本 Prompt，将使用系统内置</p>
              )}
            </div>

            {/* 图像 Prompt 选择 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">图像基础 Prompt</label>
              <select
                value={selectedImagePromptId || ''}
                onChange={(e) => setSelectedImagePromptId(e.target.value || null)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2442]/20 text-sm"
              >
                <option value="" disabled>选择图像 Prompt...</option>
                {imagePrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name} {prompt.isDefault && '(默认)'}
                  </option>
                ))}
              </select>
              {imagePrompts.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">暂无自定义图像 Prompt，将使用系统内置</p>
              )}
              <p className="text-xs text-gray-400 mt-1">💡 更多风格可在生成图片步骤中选择标签组合</p>
            </div>
          </div>
        </div>

        {/* 内容预览 */}
        <div className="mb-8 p-4 bg-gray-50 rounded-xl">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            {originalTitle || '内容预览'}
          </h4>
          <p className="text-sm text-gray-500 line-clamp-3">
            {originalText.substring(0, 200)}
            {originalText.length > 200 && '...'}
          </p>
        </div>

        {/* 确认按钮 */}
        <button
          onClick={handleConfirm}
          disabled={generationMode === 'quick' && (isGeneratingQuickPrompts || quickPrompts.length === 0)}
          className="w-full py-4 bg-[#FF2442] text-white font-bold rounded-2xl hover:bg-[#E61F3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generationMode === 'standard' ? '确认，生成大纲' : '确认，生成文案'}
        </button>
      </div>
    </div>
  );
}
