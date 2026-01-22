'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { RiLoader4Line, RiCheckLine, RiEditLine, RiRefreshLine, RiRobot2Line } from 'react-icons/ri';
import { useCreationStore } from '@/store/useCreationStore';

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

export default function ParserStep() {
  const {
    inputType,
    inputUrl,
    inputText,
    inputFile,
    originalText,
    originalTitle,
    isParsingContent,
    setOriginalText,
    setOriginalTitle,
    setIsParsingContent,
    setStep,
    setError,
    error,
    selectedProfileId,
    setSelectedProfileId,
  } = useCreationStore();

  const [localText, setLocalText] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isParsed, setIsParsed] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // AI Profile 相关状态
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // 组件挂载时自动开始解析
  useEffect(() => {
    if (!isParsed && !isParsingContent && !originalText) {
      handleParse();
    } else if (originalText) {
      // 已有数据时恢复
      setLocalText(originalText);
      setLocalTitle(originalTitle);
      setIsParsed(true);
    }
  }, []);

  // 解析完成后获取 AI Profile 列表
  useEffect(() => {
    if (isParsed && profiles.length === 0) {
      fetchProfiles();
    }
  }, [isParsed]);

  // 获取 AI Profile 列表
  const fetchProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const res = await fetch('/api/ai-profile');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const enabledProfiles = data.data.filter((p: AIProfile) => p.enabled);
        setProfiles(enabledProfiles);
        // 自动选中默认的 profile
        if (!selectedProfileId) {
          const defaultProfile = enabledProfiles.find((p: AIProfile) => p.isDefault);
          if (defaultProfile) {
            setSelectedProfileId(defaultProfile.id);
          } else if (enabledProfiles.length > 0) {
            setSelectedProfileId(enabledProfiles[0].id);
          }
        }
      }
    } catch (err) {
      console.error('获取 AI Profile 列表失败:', err);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  // 执行解析
  const handleParse = async () => {
    setIsParsingContent(true);
    setError(null);
    setIsParsed(false);

    try {
      let content = '';
      let title = '';

      if (inputType === 'link') {
        if (!inputUrl.trim()) {
          throw new Error('请输入链接');
        }

        const res = await fetch('/api/workflow/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputUrl }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '解析失败');

        title = data.title || '';
        content = data.content || '';

      } else if (inputType === 'text') {
        if (!inputText.trim()) {
          throw new Error('请输入文本内容');
        }
        content = inputText.trim();

      } else if (inputType === 'upload') {
        if (!inputFile) {
          throw new Error('请上传文件');
        }
        content = await inputFile.text();
        title = inputFile.name.replace(/\.[^.]+$/, '');
      }

      setLocalTitle(title);
      setLocalText(content);
      setIsParsed(true);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsParsingContent(false);
    }
  };

  // 确认内容，进入下一步
  const handleConfirm = () => {
    if (!localText.trim()) {
      setError('内容不能为空');
      return;
    }

    if (!selectedProfileId) {
      setError('请选择 AI 模型配置');
      return;
    }

    // 写入 store
    setOriginalTitle(localTitle);
    setOriginalText(localText);
    setError(null);

    // 跳转到 configure 步骤（选择模式）
    setStep('configure');

    // 滚动到 Workspace 顶部
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={workspaceRef} className="space-y-6">
      {/* 解析中状态 */}
      {isParsingContent && (
        <div className="flex flex-col items-center justify-center py-16">
          <RiLoader4Line className="text-5xl text-[#FF2442] animate-spin mb-4" />
          <p className="text-gray-700 font-semibold text-lg">正在解析内容...</p>
          <p className="text-gray-400 text-sm mt-2">
            {inputType === 'link' && '正在抓取网页内容，请稍候'}
            {inputType === 'text' && '正在处理文本内容'}
            {inputType === 'upload' && '正在读取文件内容'}
          </p>
        </div>
      )}

      {/* 解析失败状态 */}
      {!isParsingContent && !isParsed && error && (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">😢</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">解析失败</h3>
            <p className="text-red-500 text-sm mb-6">{error}</p>
            <button
              onClick={handleParse}
              className="px-8 py-3 bg-[#FF2442] text-white rounded-xl font-semibold hover:bg-[#E61E3B] transition-all flex items-center gap-2"
            >
              <RiRefreshLine /> 重新解析
            </button>
          </div>
        </div>
      )}

      {/* 已解析状态：显示内容编辑区 */}
      {isParsed && !isParsingContent && (
        <>
          {/* 标题输入 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              文章标题
            </label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="输入或编辑标题（可选）..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#FF2442] focus:ring-2 focus:ring-[#FF2442]/10 outline-none transition-all"
            />
          </div>

          {/* 内容编辑区 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                解析内容 <span className="text-gray-400 font-normal">（点击可编辑）</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{localText.length} 字</span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-sm text-[#FF2442] hover:text-[#E61E3B] font-medium flex items-center gap-1"
                >
                  <RiEditLine />
                  {isEditing ? '完成编辑' : '编辑内容'}
                </button>
              </div>
            </div>

            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              readOnly={!isEditing}
              onClick={() => !isEditing && setIsEditing(true)}
              className={`w-full h-[400px] px-4 py-3 rounded-xl outline-none resize-none text-sm leading-relaxed transition-all ${
                isEditing
                  ? 'border-2 border-[#FF2442] bg-white focus:ring-2 focus:ring-[#FF2442]/10'
                  : 'border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100'
              }`}
              placeholder="解析后的内容将显示在这里..."
            />
          </div>

          {/* 提示信息 */}
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm">
            💡 请检查解析内容是否正确。点击文本区域可直接编辑，选择 AI 模型后点击确认按钮选择生成模式。
          </div>

          {/* AI Profile 选择 */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <RiRobot2Line className="text-[#FF2442]" />
              选择 AI 模型配置
            </label>
            {isLoadingProfiles ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <RiLoader4Line className="animate-spin" />
                加载模型配置中...
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-amber-600 text-sm">
                暂无可用的 AI 模型配置，请先在
                <Link href="/admin/settings" className="text-[#FF2442] underline mx-1">
                  配置管理
                </Link>
                添加配置
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedProfileId || ''}
                  onChange={(e) => setSelectedProfileId(e.target.value || null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:border-[#FF2442] focus:ring-2 focus:ring-[#FF2442]/10 outline-none transition-all text-gray-700"
                >
                  <option value="">请选择模型配置</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} {profile.isDefault ? '(默认)' : ''} - {profile.textModel}
                    </option>
                  ))}
                </select>
                {selectedProfileId && (
                  <div className="text-xs text-gray-500 mt-2">
                    {(() => {
                      const selected = profiles.find((p) => p.id === selectedProfileId);
                      if (!selected) return null;
                      return (
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            文本: {selected.textModel}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                            图像: {selected.imageModel}
                          </span>
                          {selected.description && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {selected.description}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              onClick={handleParse}
              disabled={isParsingContent}
              className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RiRefreshLine className={isParsingContent ? 'animate-spin' : ''} />
              重新解析
            </button>
            <button
              onClick={handleConfirm}
              disabled={!localText.trim() || !selectedProfileId}
              className="px-8 py-3 bg-[#FF2442] text-white rounded-xl font-semibold hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-[#FF2442]/20"
            >
              <RiCheckLine /> 确认内容，下一步
            </button>
          </div>
        </>
      )}
    </div>
  );
}
