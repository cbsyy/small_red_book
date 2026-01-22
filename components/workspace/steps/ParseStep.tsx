'use client';

import { useState } from 'react';
import { RiCheckLine, RiLoader4Line, RiEditLine } from 'react-icons/ri';
import { useCreationStore } from '@/store/useCreationStore';

export default function ParseStep() {
  const {
    originalText,
    originalTitle,
    isParsingContent,
    setOriginalText,
    setOriginalTitle,
    setStep,
    setIsGeneratingOutline,
    setOutline,
    setError,
  } = useCreationStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(originalText);

  const handleConfirmEdit = () => {
    setOriginalText(editedText);
    setIsEditing(false);
  };

  const handleProceedToOutline = async () => {
    if (!originalText.trim()) {
      setError('请先确认解析内容');
      return;
    }

    setIsGeneratingOutline(true);
    setError(null);

    try {
      const res = await fetch('/api/workflow/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: originalText,
          title: originalTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成大纲失败');

      setOutline(data.outline);
      setStep('outline');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  if (isParsingContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RiLoader4Line className="text-4xl text-[#FF2442] animate-spin mb-4" />
        <p className="text-gray-600 font-medium">正在解析内容...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">文章标题</label>
        <input
          type="text"
          value={originalTitle}
          onChange={(e) => setOriginalTitle(e.target.value)}
          placeholder="输入或编辑标题..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#FF2442] focus:ring-2 focus:ring-[#FF2442]/10 outline-none transition-all"
        />
      </div>

      {/* 内容区域 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700">解析内容</label>
          <button
            onClick={() => {
              setEditedText(originalText);
              setIsEditing(!isEditing);
            }}
            className="text-sm text-[#FF2442] hover:text-[#E61E3B] font-medium flex items-center gap-1"
          >
            <RiEditLine /> {isEditing ? '取消编辑' : '编辑内容'}
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-[300px] px-4 py-3 border border-[#FF2442] rounded-xl focus:ring-2 focus:ring-[#FF2442]/10 outline-none resize-none font-mono text-sm"
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
          <div className="w-full h-[300px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl overflow-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{originalText}</pre>
          </div>
        )}
      </div>

      {/* 字数统计 */}
      <div className="text-right text-sm text-gray-500">
        共 {originalText.length} 字
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          onClick={handleProceedToOutline}
          disabled={!originalText.trim()}
          className="px-6 py-3 bg-[#FF2442] text-white rounded-xl font-semibold hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <RiCheckLine /> 确认内容，生成大纲
        </button>
      </div>
    </div>
  );
}
