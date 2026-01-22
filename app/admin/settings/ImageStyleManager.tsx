'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiDraggable,
  RiArrowUpLine,
  RiArrowDownLine,
} from 'react-icons/ri';

type ImageStyle = {
  id: string;
  name: string;
  nameEn: string;
  icon: string | null;
  promptSnippet: string;
  enabled: boolean;
  order: number;
};

type FormData = {
  name: string;
  nameEn: string;
  icon: string;
  promptSnippet: string;
  enabled: boolean;
};

const EMOJI_OPTIONS = ['🎌', '🚀', '✨', '🐱', '📊', '🎨', '📻', '🌃', '📱', '✏️', '🏷️', '🎯', '💫', '🌈', '🔥', '💎'];

export default function ImageStyleManager() {
  const [styles, setStyles] = useState<ImageStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    nameEn: '',
    icon: '🏷️',
    promptSnippet: '',
    enabled: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStyles = useCallback(async () => {
    try {
      const res = await fetch('/api/image-style');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStyles(data.data);
        }
      }
    } catch (err) {
      console.error('获取风格列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId ? `/api/image-style/${editingId}` : '/api/image-style';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '操作失败');
      }

      showMessage(editingId ? '更新成功' : '创建成功');
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', nameEn: '', icon: '🏷️', promptSnippet: '', enabled: true });
      fetchStyles();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (style: ImageStyle) => {
    setForm({
      name: style.name,
      nameEn: style.nameEn,
      icon: style.icon || '🏷️',
      promptSnippet: style.promptSnippet,
      enabled: style.enabled,
    });
    setEditingId(style.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此风格标签？')) return;

    try {
      const res = await fetch(`/api/image-style/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('删除成功');
        fetchStyles();
      }
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const toggleEnabled = async (style: ImageStyle) => {
    try {
      await fetch(`/api/image-style/${style.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !style.enabled }),
      });
      fetchStyles();
    } catch (err) {
      console.error('切换状态失败:', err);
    }
  };

  const handleMoveOrder = async (style: ImageStyle, direction: 'up' | 'down') => {
    const currentIndex = styles.findIndex(s => s.id === style.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= styles.length) return;

    const targetStyle = styles[targetIndex];

    try {
      // 交换两个风格的 order
      await Promise.all([
        fetch(`/api/image-style/${style.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: targetStyle.order }),
        }),
        fetch(`/api/image-style/${targetStyle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: style.order }),
        }),
      ]);
      fetchStyles();
    } catch (err) {
      console.error('调整顺序失败:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', nameEn: '', icon: '🏷️', promptSnippet: '', enabled: true });
  };

  const handleAdd = () => {
    setForm({ name: '', nameEn: '', icon: '🏷️', promptSnippet: '', enabled: true });
    setEditingId(null);
    setShowForm(true);
  };

  return (
    <div>
      {/* 消息提示 */}
      {(error || success) && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg font-medium ${
            error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}
        >
          {error || success}
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-gray-500">
            风格标签用于控制 AI 图像生成的视觉风格，用户可以选择多个标签组合使用
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF2442] text-white rounded-xl font-medium hover:bg-[#E61E3B]"
        >
          <RiAddLine />
          新增风格
        </button>
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? '编辑' : '新增'}风格标签
              </h2>
              <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-lg">
                <RiCloseLine className="text-xl text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    中文名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="如：动漫、科幻"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF2442]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    英文名称
                  </label>
                  <input
                    type="text"
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    placeholder="如：anime、sci-fi"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图标
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setForm({ ...form, icon: emoji })}
                      className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                        form.icon === emoji
                          ? 'border-[#FF2442] bg-[#FF2442]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  提示词片段 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.promptSnippet}
                  onChange={(e) => setForm({ ...form, promptSnippet: e.target.value })}
                  placeholder="英文提示词片段，如：anime illustration style, vibrant colors, expressive characters"
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none resize-none font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  此片段会被添加到图像生成的提示词中，请使用英文
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#FF2442]"
                />
                <span className="text-sm">启用此风格</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-[#FF2442] text-white rounded-xl font-medium hover:bg-[#E61E3B] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <RiLoader4Line className="animate-spin" /> : <RiCheckLine />}
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 风格列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RiLoader4Line className="text-4xl text-gray-300 animate-spin" />
        </div>
      ) : styles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🎨</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">暂无风格标签</h3>
          <p className="text-gray-500">点击「新增风格」创建第一个风格标签</p>
        </div>
      ) : (
        <div className="space-y-2">
          {styles.map((style, index) => (
            <div
              key={style.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                style.enabled ? 'border-transparent bg-gray-50' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* 排序按钮 */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveOrder(style, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <RiArrowUpLine />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(style, 'down')}
                      disabled={index === styles.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <RiArrowDownLine />
                    </button>
                  </div>

                  {/* 开关 */}
                  <button
                    onClick={() => toggleEnabled(style)}
                    className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                      style.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      style.enabled ? 'left-5' : 'left-1'
                    }`} />
                  </button>

                  {/* 图标和名称 */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{style.icon}</span>
                    <div>
                      <div className="font-bold text-gray-900">{style.name}</div>
                      <div className="text-xs text-gray-400">{style.nameEn}</div>
                    </div>
                  </div>

                  {/* 提示词片段预览 */}
                  <div className="flex-1 min-w-0 ml-4">
                    <p className="text-sm text-gray-500 truncate">{style.promptSnippet}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleEdit(style)}
                    className="p-2 hover:bg-gray-100 text-gray-500 rounded-lg"
                    title="编辑"
                  >
                    <RiEditLine />
                  </button>
                  <button
                    onClick={() => handleDelete(style.id)}
                    className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-lg"
                    title="删除"
                  >
                    <RiDeleteBinLine />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
