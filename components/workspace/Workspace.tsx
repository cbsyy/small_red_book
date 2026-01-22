'use client';

import { useCreationStore } from '@/store/useCreationStore';
import { RiCloseLine, RiRefreshLine } from 'react-icons/ri';
import StepIndicator from './StepIndicator';
import ParserStep from './ParserStep';
import ConfigureStep from './steps/ConfigureStep';
import OutlineStep from './steps/OutlineStep';
import PromptEditStep from './steps/PromptEditStep';
import DraftingStep from './steps/DraftingStep';
import VisualStep from './steps/VisualStep';

interface WorkspaceProps {
  isVisible: boolean;
}

export default function Workspace({ isVisible }: WorkspaceProps) {
  const { step, error, setError, outline, setOutline, setStep } = useCreationStore();

  if (!isVisible || step === 'idle') return null;

  // 生成单张图片
  const handleGenerateImage = async (cardIndex: number, prompt: string): Promise<string> => {
    const response = await fetch('/api/workflow/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '生成失败');
    }

    const data = await response.json();
    return data.data.imageUrl;
  };

  // 翻译中文到英文
  const handleTranslateToEnglish = async (chinese: string): Promise<string> => {
    const response = await fetch('/api/workflow/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chinese, direction: 'zh2en' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '翻译失败');
    }

    const data = await response.json();
    return data.data.translated;
  };

  // 转换 outline 为 PromptEditStep 需要的格式
  const cardsForEdit = outline.map((item) => ({
    pageNumber: item.pageNumber,
    pageType: item.pageType || 'concept',
    title: item.title,
    subtitle: item.subtitle || '',
    points: item.points || [],
    imagePrompt: item.imagePrompt,
    imagePromptExplain: item.imagePromptExplain || '',
    generatedImageUrl: item.generatedImageUrl,
    status: item.status || 'draft',
    error: item.error,
  }));

  // 更新卡片数据
  const handleCardsChange = (newCards: typeof cardsForEdit) => {
    const updatedOutline = outline.map((item, index) => ({
      ...item,
      ...newCards[index],
      id: item.id,
    }));
    setOutline(updatedOutline);
  };

  return (
    <div
      id="workspace"
      className={`w-full mx-auto mt-8 mb-16 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        step === 'prompt-edit' ? 'max-w-7xl' : 'max-w-4xl'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      {/* 工作区容器 */}
      <div className="bg-white/90 border border-white/60 rounded-[24px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] backdrop-blur-[20px] overflow-hidden">
        {/* 步骤指示器 */}
        <StepIndicator currentStep={step} />

        {/* 全局错误提示 */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
                  <span>操作失败</span>
                </div>
                <p className="text-red-600 text-sm">{error}</p>
                {error.includes('格式') && (
                  <p className="text-red-500 text-xs mt-2">
                    提示：这可能是 AI 模型输出格式不稳定导致的，通常重试即可解决
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(step === 'outline' || error.includes('格式') || error.includes('重试')) && (
                  <button
                    onClick={() => {
                      setError(null);
                      // 触发重新生成（通过清空再设置来触发 useEffect）
                      if (step === 'outline') {
                        window.dispatchEvent(new CustomEvent('retry-outline'));
                      }
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                    title="重试"
                  >
                    <RiRefreshLine className="text-lg" />
                  </button>
                )}
                <button
                  onClick={() => setError(null)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="关闭"
                >
                  <RiCloseLine className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 步骤内容 */}
        <div className="p-6">
          {step === 'parsing' && <ParserStep />}
          {step === 'configure' && <ConfigureStep />}
          {step === 'outline' && <OutlineStep />}
          {step === 'prompt-edit' && (
            <PromptEditStep
              cards={cardsForEdit}
              onCardsChange={handleCardsChange}
              onGenerateImage={handleGenerateImage}
              onTranslateToEnglish={handleTranslateToEnglish}
              onBack={() => setStep('outline')}
              onNext={() => setStep('visual')}
            />
          )}
          {step === 'drafting' && <DraftingStep />}
          {step === 'visual' && <VisualStep />}
        </div>
      </div>
    </div>
  );
}
