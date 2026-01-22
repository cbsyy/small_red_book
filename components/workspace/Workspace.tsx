'use client';

import { useCreationStore } from '@/store/useCreationStore';
import StepIndicator from './StepIndicator';
import ParserStep from './ParserStep';
import ConfigureStep from './steps/ConfigureStep';
import OutlineStep from './steps/OutlineStep';
import DraftingStep from './steps/DraftingStep';
import VisualStep from './steps/VisualStep';

interface WorkspaceProps {
  isVisible: boolean;
}

export default function Workspace({ isVisible }: WorkspaceProps) {
  const { step, error } = useCreationStore();

  if (!isVisible || step === 'idle') return null;

  return (
    <div
      id="workspace"
      className={`w-full max-w-4xl mx-auto mt-8 mb-16 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* 工作区容器 */}
      <div className="bg-white/90 border border-white/60 rounded-[24px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] backdrop-blur-[20px] overflow-hidden">
        {/* 步骤指示器 */}
        <StepIndicator currentStep={step} />

        {/* 全局错误提示 */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* 步骤内容 */}
        <div className="p-6">
          {step === 'parsing' && <ParserStep />}
          {step === 'configure' && <ConfigureStep />}
          {step === 'outline' && <OutlineStep />}
          {step === 'drafting' && <DraftingStep />}
          {step === 'visual' && <VisualStep />}
        </div>
      </div>
    </div>
  );
}
