'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiStarFill,
  RiFileTextLine,
  RiImageLine,
  RiRefreshLine,
} from 'react-icons/ri';

type PromptConfig = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  content: string;
  isDefault: boolean;
  enabled: boolean;
};

type FormData = {
  name: string;
  description: string;
  kind: string;
  content: string;
  isDefault: boolean;
  enabled: boolean;
};

const KIND_OPTIONS = [
  { value: 'text', label: '文本', icon: RiFileTextLine },
  { value: 'image', label: '图像', icon: RiImageLine },
];

export default function PromptManager() {
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    kind: 'text',
    content: '',
    isDefault: false,
    enabled: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/prompt-config');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConfigs(data.data);
        }
      }
    } catch (err) {
      console.error('获取配置失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const initDefaultConfigs = async () => {
    try {
      const res = await fetch('/api/prompt-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init' }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.message);
        fetchConfigs();
      }
    } catch (err) {
      console.error('初始化失败:', err);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

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
      const url = editingId ? `/api/prompt-config/${editingId}` : '/api/prompt-config';
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
      setForm({ name: '', description: '', kind: activeTab, content: '', isDefault: false, enabled: true });
      fetchConfigs();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (config: PromptConfig) => {
    setForm({
      name: config.name,
      description: config.description || '',
      kind: config.kind,
      content: config.content,
      isDefault: config.isDefault,
      enabled: config.enabled,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此配置？')) return;

    try {
      const res = await fetch(`/api/prompt-config/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('删除成功');
        fetchConfigs();
      }
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch('/api/prompt-config/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showMessage('已设为默认');
        fetchConfigs();
      }
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const toggleEnabled = async (config: PromptConfig) => {
    try {
      await fetch(`/api/prompt-config/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.enabled }),
      });
      fetchConfigs();
    } catch (err) {
      console.error('切换状态失败:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', description: '', kind: activeTab, content: '', isDefault: false, enabled: true });
  };

  const handleAdd = () => {
    // 新增时，类型固定为当前 tab
    setForm({ name: '', description: '', kind: activeTab, content: '', isDefault: false, enabled: true });
    setEditingId(null);
    setShowForm(true);
  };

  const filteredConfigs = configs.filter((c) => c.kind === activeTab);

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
        <div className="flex gap-2">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveTab(opt.value as 'text' | 'image')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === opt.value
                  ? 'bg-[#FF2442] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <opt.icon />
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={initDefaultConfigs}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200"
          >
            <RiRefreshLine />
            初始化默认
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF2442] text-white rounded-xl font-medium hover:bg-[#E61E3B]"
          >
            <RiAddLine />
            新增
          </button>
        </div>
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? '编辑' : '新增'}{activeTab === 'text' ? '文本' : '图像'} Prompt
              </h2>
              <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-lg">
                <RiCloseLine className="text-xl text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配置名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={`如：${activeTab === 'text' ? '精炼文本 Prompt' : '小红书风格图像'}`}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#FF2442]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="配置说明（可选）"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              {/* 类型显示（只读，根据当前 tab 自动设置） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl">
                  {activeTab === 'text' ? <RiFileTextLine className="text-blue-500" /> : <RiImageLine className="text-green-500" />}
                  <span className="font-medium">{activeTab === 'text' ? '文本 Prompt' : '图像 Prompt'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt 内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={activeTab === 'text'
                    ? '输入文本生成的系统提示词...'
                    : '输入图像风格描述...'}
                  required
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none resize-none font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {activeTab === 'text'
                    ? '文本 Prompt 用于指导 AI 生成大纲和文案'
                    : '图像 Prompt 用于描述生成图片的风格和要求'}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-[#FF2442]"
                  />
                  <span className="text-sm">设为默认</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-[#FF2442]"
                  />
                  <span className="text-sm">启用</span>
                </label>
              </div>

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

      {/* 配置列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RiLoader4Line className="text-4xl text-gray-300 animate-spin" />
        </div>
      ) : filteredConfigs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">{activeTab === 'text' ? '📝' : '🎨'}</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">暂无配置</h3>
          <p className="text-gray-500">点击「初始化默认」或「新增」创建配置</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConfigs.map((config) => (
            <div
              key={config.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                config.enabled ? 'border-transparent bg-gray-50' : 'border-gray-100 opacity-60'
              } ${config.isDefault ? 'ring-2 ring-[#FF2442]/30' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleEnabled(config)}
                    className={`mt-1 w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                      config.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      config.enabled ? 'left-5' : 'left-1'
                    }`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{config.name}</span>
                      {config.isDefault && (
                        <span className="px-2 py-0.5 bg-[#FF2442]/10 text-[#FF2442] text-xs rounded-full flex items-center gap-1">
                          <RiStarFill className="text-xs" /> 默认
                        </span>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-500 mb-2">{config.description}</p>
                    )}
                    <div className="bg-white rounded-lg p-3 max-h-24 overflow-y-auto border border-gray-100">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                        {config.content.length > 200
                          ? config.content.substring(0, 200) + '...'
                          : config.content}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  {!config.isDefault && (
                    <button
                      onClick={() => handleSetDefault(config.id)}
                      className="p-2 text-gray-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                      title="设为默认"
                    >
                      <RiStarFill />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 hover:bg-gray-100 text-gray-500 rounded-lg"
                    title="编辑"
                  >
                    <RiEditLine />
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
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
