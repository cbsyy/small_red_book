'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiPlayCircleLine,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiStarFill,
  RiChat3Line,
  RiSendPlane2Fill,
  RiImageLine,
} from 'react-icons/ri';

type AIProfile = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  provider: string;
  baseURL: string;
  apiKey: string;
  model: string;
  systemPrompt: string | null;
  isDefault: boolean;
  enabled: boolean;
};

type FormData = {
  name: string;
  description: string;
  kind: string;
  provider: string;
  baseURL: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  isDefault: boolean;
  enabled: boolean;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', baseURL: 'https://api.openai.com/v1' },
  { value: 'zhipu', label: '智谱AI', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  { value: 'qwen', label: '通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'deepseek', label: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1' },
  { value: 'siliconflow', label: 'SiliconFlow', baseURL: 'https://api.siliconflow.cn/v1' },
  { value: 'custom', label: '自定义', baseURL: '' },
];

const KIND_OPTIONS = [
  { value: 'text', label: '文本', description: '聊天、大纲、文案' },
  { value: 'image', label: '图像', description: '生成图片' },
  { value: 'universal', label: '通用', description: '所有场景' },
];

const defaultForm: FormData = {
  name: '',
  description: '',
  kind: 'text',
  provider: 'openai',
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  systemPrompt: '',
  isDefault: false,
  enabled: true,
};

export default function ModelManager() {
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 测试问答
  const [showChat, setShowChat] = useState(false);
  const [chatProfile, setChatProfile] = useState<AIProfile | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 图像测试
  const [showImageTest, setShowImageTest] = useState(false);
  const [imageTestProfile, setImageTestProfile] = useState<AIProfile | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageError, setImageError] = useState('');

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfiles(data.data);
        }
      }
    } catch (err) {
      console.error('获取配置失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleProviderChange = (provider: string) => {
    const selected = PROVIDERS.find((p) => p.value === provider);
    setForm((prev) => ({
      ...prev,
      provider,
      baseURL: selected?.baseURL || prev.baseURL,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId ? `/api/ai-profile/${editingId}` : '/api/ai-profile';
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
      setForm(defaultForm);
      fetchProfiles();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (profile: AIProfile) => {
    setForm({
      name: profile.name,
      description: profile.description || '',
      kind: profile.kind,
      provider: profile.provider,
      baseURL: profile.baseURL,
      apiKey: '',
      model: profile.model,
      systemPrompt: profile.systemPrompt || '',
      isDefault: profile.isDefault,
      enabled: profile.enabled,
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此配置？')) return;

    try {
      const res = await fetch(`/api/ai-profile/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('删除成功');
        fetchProfiles();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch('/api/ai-profile/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showMessage('已设为默认');
        fetchProfiles();
      }
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const toggleEnabled = async (profile: AIProfile) => {
    try {
      await fetch(`/api/ai-profile/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !profile.enabled }),
      });
      fetchProfiles();
    } catch (err) {
      console.error('切换状态失败:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  // 测试问答
  const openChat = (profile: AIProfile) => {
    setChatProfile(profile);
    setChatHistory([]);
    setChatMessage('');
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setChatProfile(null);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !chatProfile || isChatting) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');
    setChatHistory((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          profileId: chatProfile.id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setChatHistory((prev) => [...prev, { role: 'assistant', content: data.result }]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: 'assistant', content: `错误: ${data.error || '请求失败'}` },
        ]);
      }
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: `错误: ${err.message || '网络错误'}` },
      ]);
    } finally {
      setIsChatting(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // 图像测试
  const openImageTest = (profile: AIProfile) => {
    setImageTestProfile(profile);
    setImagePrompt('');
    setGeneratedImage(null);
    setImageError('');
    setShowImageTest(true);
  };

  const closeImageTest = () => {
    setShowImageTest(false);
    setImageTestProfile(null);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || !imageTestProfile || isGenerating) return;

    setIsGenerating(true);
    setGeneratedImage(null);
    setImageError('');

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          profileId: imageTestProfile.id,
          enhanceWithStyle: false,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGeneratedImage(data.data.imageUrl);
      } else {
        setImageError(data.error || '生成失败');
      }
    } catch (err: any) {
      setImageError(err.message || '网络错误');
    } finally {
      setIsGenerating(false);
    }
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
        <p className="text-gray-500 text-sm">配置文本和图像 AI 模型</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF2442] text-white rounded-xl font-medium hover:bg-[#E61E3B] transition-colors"
        >
          <RiAddLine />
          新增模型
        </button>
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId ? '编辑模型' : '新增模型'}</h2>
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
                  placeholder="如：GPT-4o 文本"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF2442]/20 focus:border-[#FF2442] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                  <select
                    value={form.provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用途</label>
                  <select
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none"
                  >
                    {KIND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.baseURL}
                  onChange={(e) => setForm({ ...form, baseURL: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key <span className="text-red-500">*</span>
                  {editingId && <span className="text-gray-400 text-xs ml-2">（留空则不修改）</span>}
                </label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                  required={!editingId}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模型 ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder={form.kind === 'image' ? 'dall-e-3' : 'gpt-4o'}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none"
                />
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

      {/* 测试问答对话框 */}
      {showChat && chatProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold">测试问答</h2>
                <p className="text-sm text-gray-500">{chatProfile.name} · {chatProfile.model}</p>
              </div>
              <button onClick={closeChat} className="p-2 hover:bg-gray-100 rounded-lg">
                <RiCloseLine className="text-xl text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <RiChat3Line className="text-5xl mx-auto mb-3 opacity-50" />
                  <p>发送消息开始测试</p>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#FF2442] text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <RiLoader4Line className="animate-spin text-lg" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  placeholder="输入消息..."
                  disabled={isChatting}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none disabled:bg-gray-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || isChatting}
                  className="px-5 py-3 bg-[#FF2442] text-white rounded-xl font-medium disabled:bg-gray-300 flex items-center gap-2"
                >
                  <RiSendPlane2Fill />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 图像测试对话框 */}
      {showImageTest && imageTestProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold">图像生成测试</h2>
                <p className="text-sm text-gray-500">{imageTestProfile.name} · {imageTestProfile.model}</p>
              </div>
              <button onClick={closeImageTest} className="p-2 hover:bg-gray-100 rounded-lg">
                <RiCloseLine className="text-xl text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="描述要生成的图片..."
                rows={3}
                disabled={isGenerating}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none resize-none mb-4"
              />
              <button
                onClick={handleGenerateImage}
                disabled={!imagePrompt.trim() || isGenerating}
                className="w-full py-3 bg-[#FF2442] text-white rounded-xl font-medium disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RiLoader4Line className="animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <RiImageLine />
                    生成图片
                  </>
                )}
              </button>
              {imageError && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">{imageError}</div>
              )}
              {generatedImage && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">生成结果：</p>
                  <img src={generatedImage} alt="生成的图片" className="w-full rounded-xl border border-gray-200" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 配置列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RiLoader4Line className="text-4xl text-gray-300 animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">暂无模型配置</h3>
          <p className="text-gray-500">点击「新增模型」开始添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                profile.enabled ? 'border-transparent bg-gray-50' : 'border-gray-100 opacity-60'
              } ${profile.isDefault ? 'ring-2 ring-[#FF2442]/30' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleEnabled(profile)}
                    className={`w-10 h-6 rounded-full relative transition-colors ${
                      profile.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      profile.enabled ? 'left-5' : 'left-1'
                    }`} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{profile.name}</span>
                      {profile.isDefault && (
                        <span className="px-2 py-0.5 bg-[#FF2442]/10 text-[#FF2442] text-xs rounded-full flex items-center gap-1">
                          <RiStarFill className="text-xs" /> 默认
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        profile.kind === 'text' ? 'bg-blue-50 text-blue-600' :
                        profile.kind === 'image' ? 'bg-green-50 text-green-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {KIND_OPTIONS.find(k => k.value === profile.kind)?.label}: {profile.model}
                      </span>
                      <span className="text-gray-400">{profile.provider}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {profile.kind !== 'image' && (
                    <button
                      onClick={() => openChat(profile)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-[#FF2442] hover:bg-[#FF2442]/10 rounded-lg"
                    >
                      <RiChat3Line />
                    </button>
                  )}
                  {profile.kind === 'image' && (
                    <button
                      onClick={() => openImageTest(profile)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-[#FF2442] hover:bg-[#FF2442]/10 rounded-lg"
                    >
                      <RiImageLine />
                    </button>
                  )}
                  {!profile.isDefault && (
                    <button
                      onClick={() => handleSetDefault(profile.id)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                    >
                      <RiStarFill />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(profile)}
                    className="p-2 hover:bg-gray-100 text-gray-500 rounded-lg"
                  >
                    <RiEditLine />
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-lg"
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
