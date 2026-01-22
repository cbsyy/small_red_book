'use client';

import { useState } from 'react';
import {
  RiRobot2Line,
  RiFileTextLine,
  RiArrowLeftLine,
  RiPaletteLine,
} from 'react-icons/ri';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// 动态导入子模块
const ModelManager = dynamic(() => import('./ModelManager'), { ssr: false });
const PromptManager = dynamic(() => import('./PromptManager'), { ssr: false });
const ImageStyleManager = dynamic(() => import('./ImageStyleManager'), { ssr: false });

type TabType = 'model' | 'prompt' | 'style';

const TABS = [
  { id: 'model' as TabType, label: '模型管理', icon: RiRobot2Line, description: '配置 AI 模型接口' },
  { id: 'prompt' as TabType, label: 'Prompt 管理', icon: RiFileTextLine, description: '配置提示词模板' },
  { id: 'style' as TabType, label: '风格管理', icon: RiPaletteLine, description: '配置图像风格标签' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('model');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow hover:shadow-md transition-shadow"
          >
            <RiArrowLeftLine className="text-xl text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">配置管理</h1>
            <p className="text-gray-500 text-sm">管理 AI 模型和 Prompt 配置</p>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="bg-white rounded-2xl shadow-sm mb-6">
          <div className="flex border-b border-gray-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-[#FF2442] border-b-2 border-[#FF2442] bg-red-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="text-xl" />
                <div className="text-left">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-70">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {activeTab === 'model' && <ModelManager />}
          {activeTab === 'prompt' && <PromptManager />}
          {activeTab === 'style' && <ImageStyleManager />}
        </div>
      </div>
    </div>
  );
}
