'use client';

import { RiFileTextLine, RiListCheck2, RiQuillPenLine, RiImageLine, RiCheckLine, RiSettings4Line, RiEdit2Line } from 'react-icons/ri';
import { useCreationStore, type WorkflowStep } from '@/store/useCreationStore';

interface StepIndicatorProps {
  currentStep: WorkflowStep;
}

// 标准模式步骤
const standardSteps: { key: WorkflowStep; label: string; icon: React.ReactNode }[] = [
  { key: 'parsing', label: '解析内容', icon: <RiFileTextLine /> },
  { key: 'configure', label: '选择模式', icon: <RiSettings4Line /> },
  { key: 'outline', label: '编辑大纲', icon: <RiListCheck2 /> },
  { key: 'prompt-edit', label: '编辑Prompt', icon: <RiEdit2Line /> },
  { key: 'visual', label: '生成图片', icon: <RiImageLine /> },
];

// 快速模式步骤
const quickSteps: { key: WorkflowStep; label: string; icon: React.ReactNode }[] = [
  { key: 'parsing', label: '解析内容', icon: <RiFileTextLine /> },
  { key: 'configure', label: '配置模式', icon: <RiSettings4Line /> },
  { key: 'prompt-edit', label: '编辑Prompt', icon: <RiEdit2Line /> },
  { key: 'visual', label: '生成图片', icon: <RiImageLine /> },
];

const standardStepOrder: WorkflowStep[] = ['parsing', 'configure', 'outline', 'prompt-edit', 'visual'];
const quickStepOrder: WorkflowStep[] = ['parsing', 'configure', 'prompt-edit', 'visual'];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { generationMode } = useCreationStore();

  // 根据模式选择步骤配置
  const steps = generationMode === 'quick' ? quickSteps : standardSteps;
  const stepOrder = generationMode === 'quick' ? quickStepOrder : standardStepOrder;

  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="px-6 py-5 border-b border-black/5 bg-gradient-to-r from-gray-50/50 to-white/50">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = currentIndex > index;

          return (
            <div key={step.key} className="flex items-center flex-1">
              {/* 步骤圆圈 */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-[#FF2442] text-white shadow-[0_4px_12px_rgba(255,36,66,0.3)]'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? <RiCheckLine /> : step.icon}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold transition-colors ${
                    isActive ? 'text-[#FF2442]' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* 连接线 */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 mt-[-20px]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
