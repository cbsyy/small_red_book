'use client';

import { useState, useRef, useEffect } from 'react';
import {
  RiUploadCloud2Line,
  RiFolderImageLine,
  RiMagicLine,
  RiCloseLine,
  RiCheckLine,
  RiLoader4Line,
  RiHeartLine,
  RiHeartFill,
  RiDeleteBinLine,
} from 'react-icons/ri';

interface BackgroundImage {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
  source: string;
  prompt?: string;
  isFavorite: boolean;
  useCount: number;
}

interface BackgroundSelectorProps {
  currentUrl?: string;
  onSelect: (url: string, id?: string) => void;
  onGenerate?: (prompt: string) => Promise<string>;  // 返回生成的图片 URL
}

type TabType = 'upload' | 'library' | 'generate';

export default function BackgroundSelector({
  currentUrl,
  onSelect,
  onGenerate,
}: BackgroundSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [library, setLibrary] = useState<BackgroundImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载背景库
  useEffect(() => {
    if (activeTab === 'library') {
      loadLibrary();
    }
  }, [activeTab]);

  const loadLibrary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/background?limit=50');
      const data = await res.json();
      if (data.success) {
        setLibrary(data.data);
      }
    } catch (error) {
      console.error('加载背景库失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 上传图片
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 创建预览 URL
    const previewUrl = URL.createObjectURL(file);
    onSelect(previewUrl);

    // TODO: 上传到服务器并保存到库
    // 这里简化处理，直接使用本地预览
  };

  // 生成背景
  const handleGenerate = async () => {
    if (!prompt.trim() || !onGenerate) return;

    setIsGenerating(true);
    try {
      const url = await onGenerate(prompt);
      onSelect(url);

      // 保存到库
      await fetch('/api/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `AI 生成 ${new Date().toLocaleString()}`,
          source: 'prompt',
          prompt,
          imageUrl: url,
        }),
      });

      // 刷新库
      loadLibrary();
    } catch (error) {
      console.error('生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 选择库中的图片
  const handleSelectFromLibrary = (item: BackgroundImage) => {
    setSelectedId(item.id);
    onSelect(item.imageUrl, item.id);
  };

  // 切换收藏
  const toggleFavorite = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/background/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !current }),
      });
      setLibrary(lib =>
        lib.map(item =>
          item.id === id ? { ...item, isFavorite: !current } : item
        )
      );
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个背景？')) return;
    try {
      await fetch(`/api/background/${id}`, { method: 'DELETE' });
      setLibrary(lib => lib.filter(item => item.id !== id));
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'upload', label: '上传', icon: <RiUploadCloud2Line /> },
          { key: 'library', label: '背景库', icon: <RiFolderImageLine /> },
          { key: 'generate', label: 'AI 生成', icon: <RiMagicLine /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#FF2442]/5 text-[#FF2442] border-b-2 border-[#FF2442]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {/* 上传 */}
        {activeTab === 'upload' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#FF2442] hover:bg-[#FF2442]/5 transition-colors flex flex-col items-center gap-3"
            >
              <RiUploadCloud2Line className="text-4xl text-gray-400" />
              <span className="text-gray-600">点击上传背景图片</span>
              <span className="text-gray-400 text-sm">支持 JPG、PNG、WebP</span>
            </button>
          </div>
        )}

        {/* 背景库 */}
        {activeTab === 'library' && (
          <div>
            {isLoading ? (
              <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
                <RiLoader4Line className="text-2xl animate-spin" />
                <span>加载中...</span>
              </div>
            ) : library.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p>暂无背景图</p>
                <p className="text-sm mt-1">上传或 AI 生成后会保存到这里</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {library.map((item) => (
                  <div
                    key={item.id}
                    className={`relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedId === item.id
                        ? 'border-[#FF2442] ring-2 ring-[#FF2442]/20'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectFromLibrary(item)}
                  >
                    <img
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.name}
                      className="w-full aspect-[3/4] object-cover"
                    />
                    {/* 选中标记 */}
                    {selectedId === item.id && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-[#FF2442] rounded-full flex items-center justify-center">
                        <RiCheckLine className="text-white text-xs" />
                      </div>
                    )}
                    {/* 悬浮操作 */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id, item.isFavorite);
                          }}
                          className="p-1.5 bg-white/90 rounded text-sm hover:bg-white"
                        >
                          {item.isFavorite ? (
                            <RiHeartFill className="text-red-500" />
                          ) : (
                            <RiHeartLine />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-1.5 bg-white/90 rounded text-sm hover:bg-white text-red-500"
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
        )}

        {/* AI 生成 */}
        {activeTab === 'generate' && (
          <div className="space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要的背景风格，例如：&#10;奶油色渐变背景，四角有叶子装饰，温暖舒适的感觉"
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#FF2442] outline-none resize-none text-sm"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || !onGenerate}
              className="w-full py-3 bg-[#FF2442] text-white rounded-xl font-medium hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RiLoader4Line className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <RiMagicLine />
                  生成背景
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center">
              生成的背景会自动保存到背景库
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
