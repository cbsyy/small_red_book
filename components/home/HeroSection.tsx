'use client';

import { useState, useEffect, useRef } from 'react';
import {
  RiLink,
  RiFolderUploadLine,
  RiFileTextLine,
  RiUploadCloud2Line,
  RiSparklingLine,
  RiLoader4Line,
  RiCloseLine,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiInformationFill,
} from 'react-icons/ri';
import { useCreationStore } from '@/store/useCreationStore';

const MAX_TEXT_LENGTH = 5000;
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];

type TabType = 'link' | 'upload' | 'text';
type VibeType = 'viral' | 'minimal' | 'pro';
type NotificationType = 'success' | 'error' | 'info';

interface HeroSectionProps {
  onWorkspaceStart: () => void;
}

export default function HeroSection({ onWorkspaceStart }: HeroSectionProps) {
  const {
    step,
    setStep,
    setInputType,
    setInputUrl,
    setInputText,
    setInputFile,
    setVibe,
  } = useCreationStore();

  const [activeTab, setActiveTab] = useState<TabType>('link');
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('viral');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: NotificationType } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 显示通知
  const showNotification = (msg: string, type: NotificationType = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 文件处理
  const handleFileSelect = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showNotification('暂不支持该格式', 'error');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showNotification(`文件过大，请≤${MAX_FILE_SIZE_MB} MB`, 'error');
      return;
    }
    setFile(selectedFile);
    showNotification('文件上传成功', 'success');
  };

  // URL 校验
  const validateUrl = (urlValue: string): boolean => {
    if (!urlValue.trim()) {
      showNotification('链接不能为空', 'error');
      return false;
    }
    if (!/^https?:\/\/.+/i.test(urlValue)) {
      showNotification('请输入合法链接', 'error');
      return false;
    }
    return true;
  };

  // 提交处理 - 改为 SPA 模式
  const handleSubmit = async () => {
    if (isProcessing) return;

    // 参数校验
    if (activeTab === 'link') {
      if (!validateUrl(url)) return;
    } else if (activeTab === 'upload') {
      if (!file) {
        showNotification('请先上传文件', 'error');
        return;
      }
    } else if (activeTab === 'text') {
      if (!text.trim()) {
        showNotification('请输入文本内容', 'error');
        return;
      }
      if (text.length > MAX_TEXT_LENGTH) return;
    }

    setIsProcessing(true);

    try {
      // 写入 store
      setInputType(activeTab);
      setVibe(selectedVibe);

      if (activeTab === 'link') {
        setInputUrl(url);
      } else if (activeTab === 'text') {
        setInputText(text);
      } else if (activeTab === 'upload') {
        setInputFile(file);
      }

      showNotification('开始处理...', 'info');

      // 设置步骤为 parsing
      setStep('parsing');

      // 触发滚动
      onWorkspaceStart();

    } catch (err: any) {
      showNotification(err.message || '处理失败，请重试', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isProcessing && !(activeTab === 'text' && text.length > MAX_TEXT_LENGTH)) {
          handleSubmit();
        }
      }
      // Esc 清空
      if (e.key === 'Escape') {
        if (activeTab === 'link') setUrl('');
        else if (activeTab === 'text') setText('');
        else if (activeTab === 'upload') setFile(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, url, text, isProcessing]);

  const isTextOverLimit = activeTab === 'text' && text.length > MAX_TEXT_LENGTH;

  return (
    <>
      {/* 主舞台 */}
      <div className="text-center max-w-[840px] w-[90%] -mt-5 z-10 animate-[heroReveal_1.2s_cubic-bezier(0.23,1,0.32,1)]">
        <h1 className="font-['Playfair_Display',serif] text-[clamp(40px,6vw,72px)] leading-[1.05] mb-6">
          Capture the <span className="text-[#FF2442] italic">Essence.</span>
        </h1>
        <p className="text-lg text-gray-600 mb-14 font-medium">
          让每一篇内容都拥有瞬间引爆社交媒体的魔力
        </p>

        {/* 输入面板 */}
        <div className="bg-white/75 border border-white/50 rounded-[32px] p-7 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] backdrop-blur-[30px] backdrop-saturate-[180%]">
          {/* Tab 切换 */}
          <div className="flex gap-1.5 bg-black/5 p-1.5 rounded-[18px] mb-7 w-fit">
            <button
              onClick={() => !isProcessing && setActiveTab('link')}
              className={`px-6 py-2.5 font-bold text-sm rounded-[14px] flex items-center gap-2 transition-all ${
                activeTab === 'link'
                  ? 'bg-white text-[#FF2442] shadow-[0_4px_12px_rgba(0,0,0,0.05)]'
                  : 'text-gray-500'
              }`}
            >
              <RiLink /> 链接
            </button>
            <button
              onClick={() => !isProcessing && setActiveTab('upload')}
              className={`px-6 py-2.5 font-bold text-sm rounded-[14px] flex items-center gap-2 transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-[#FF2442] shadow-[0_4px_12px_rgba(0,0,0,0.05)]'
                  : 'text-gray-500'
              }`}
            >
              <RiFolderUploadLine /> 上传
            </button>
            <button
              onClick={() => !isProcessing && setActiveTab('text')}
              className={`px-6 py-2.5 font-bold text-sm rounded-[14px] flex items-center gap-2 transition-all ${
                activeTab === 'text'
                  ? 'bg-white text-[#FF2442] shadow-[0_4px_12px_rgba(0,0,0,0.05)]'
                  : 'text-gray-500'
              }`}
            >
              <RiFileTextLine /> 文本
            </button>
          </div>

          {/* 输入控件 */}
          <div className="relative">
            {/* 链接输入 */}
            {activeTab === 'link' && (
              <div className="relative flex items-center animate-[fadeIn_0.4s_ease]">
                <div className="absolute left-6 text-[22px] text-gray-500 pointer-events-none flex items-center">
                  <RiLink />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="粘贴公众号或网页链接..."
                  autoFocus
                  className="w-full h-[68px] pl-16 pr-6 border-2 border-transparent bg-black/[0.04] rounded-[20px] text-base outline-none transition-all focus:bg-white focus:border-[#FF2442] focus:shadow-[0_0_0_6px_rgba(255,36,66,0.08)]"
                />
              </div>
            )}

            {/* 文件上传 */}
            {activeTab === 'upload' && (
              <div className="animate-[fadeIn_0.4s_ease]">
                <div
                  className="border-2 border-dashed border-black/10 rounded-[20px] p-10 text-center cursor-pointer transition-all bg-black/[0.02] hover:border-[#FF2442] hover:bg-[rgba(255,36,66,0.05)]"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-[#FF2442]', 'bg-[rgba(255,36,66,0.05)]', 'scale-[1.01]');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-[#FF2442]', 'bg-[rgba(255,36,66,0.05)]', 'scale-[1.01]');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-[#FF2442]', 'bg-[rgba(255,36,66,0.05)]', 'scale-[1.01]');
                    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
                  }}
                >
                  <RiUploadCloud2Line className="text-[32px] text-[#FF2442] mx-auto" />
                  <p className="mt-2.5 font-semibold text-gray-500">
                    {file ? '已准备就绪' : '点击选择或拖拽 PDF / DOCX / TXT'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                </div>
                {file && (
                  <div className="mt-4 px-5 py-3 bg-white rounded-[14px] flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.05)] animate-[slideIn_0.3s_cubic-bezier(0.23,1,0.32,1)]">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <RiFileTextLine className="text-[#FF2442]" />
                      <span className="font-semibold text-sm truncate max-w-[300px]" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-gray-500 hover:text-[#FF2442] transition-colors p-1"
                    >
                      <RiCloseLine className="text-lg" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 文本输入 */}
            {activeTab === 'text' && (
              <div className="relative animate-[fadeIn_0.4s_ease]">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="在此输入需要转换的文字内容..."
                  className={`w-full h-[160px] p-6 border-2 border-transparent bg-black/[0.04] rounded-[20px] text-base outline-none resize-none font-sans transition-all focus:bg-white focus:border-[#FF2442] focus:shadow-[0_0_0_6px_rgba(255,36,66,0.08)] ${
                    isTextOverLimit ? 'border-[#FF2442] text-[#FF2442]' : ''
                  }`}
                />
                <div
                  className={`absolute -bottom-6 right-2 text-xs font-semibold transition-colors ${
                    isTextOverLimit ? 'text-[#FF2442]' : 'text-gray-500'
                  }`}
                >
                  {text.length} / {MAX_TEXT_LENGTH}
                </div>
              </div>
            )}
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between mt-7 pt-6 border-t border-black/[0.06]">
            <div className="flex gap-2.5">
              {(['viral', 'minimal', 'pro'] as VibeType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => !isProcessing && setSelectedVibe(v)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    selectedVibe === v ? 'bg-gray-900 text-white' : 'bg-black/[0.04] text-gray-500'
                  }`}
                >
                  {v === 'viral' && '🔥 爆款'}
                  {v === 'minimal' && '🌿 简约'}
                  {v === 'pro' && '💼 专业'}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || isTextOverLimit}
              className="h-14 px-9 bg-[#FF2442] text-white rounded-full text-base font-bold cursor-pointer transition-all flex items-center gap-2.5 shadow-[0_16px_32px_-8px_rgba(255,36,66,0.4)] hover:translate-y-[-3px] hover:bg-[#E61E3B] disabled:bg-[#d1d1d1] disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
            >
              {isProcessing ? (
                <>
                  <RiLoader4Line className="animate-spin" /> 处理中...
                </>
              ) : (
                <>
                  <RiSparklingLine /> 开始魔法
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 通知系统 */}
      <div
        className={`fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-7 py-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center gap-3 font-semibold z-[1000] transition-all duration-400 ${
          notification ? 'translate-y-0 opacity-100' : 'translate-y-[100px] opacity-0'
        } ${
          notification?.type === 'success'
            ? 'text-green-500 border-l-[5px] border-green-500'
            : notification?.type === 'error'
            ? 'text-[#FF2442] border-l-[5px] border-[#FF2442]'
            : 'text-blue-500 border-l-[5px] border-blue-500'
        }`}
      >
        {notification?.type === 'success' && <RiCheckboxCircleFill />}
        {notification?.type === 'error' && <RiErrorWarningFill />}
        {notification?.type === 'info' && <RiInformationFill />}
        {notification?.msg}
      </div>
    </>
  );
}
