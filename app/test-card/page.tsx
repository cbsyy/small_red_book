'use client';

import { useState } from 'react';
import { CardEditor } from '@/components/card';

// 示例数据
const DEMO_CARDS = [
  {
    id: '1',
    pageNumber: 1,
    content: {
      title: '马尔可夫性是什么？',
      subtitle: '一次搞懂随机过程的关键概念',
      sections: [],
    },
    backgroundUrl: '',
  },
  {
    id: '2',
    pageNumber: 2,
    content: {
      title: '核心概念',
      sections: [
        { emoji: '📚', label: '定义', content: '当前状态包含所有未来信息' },
        { emoji: '🔄', label: '特性', content: '无需知道历史状态' },
        { emoji: '📐', label: '公式', content: 'P(未来|现在) = P(未来|现在,过去)' },
      ],
    },
    backgroundUrl: '',
  },
  {
    id: '3',
    pageNumber: 3,
    content: {
      title: '应用场景',
      sections: [
        { emoji: '🎮', label: '游戏AI', content: '状态机决策' },
        { emoji: '📈', label: '金融', content: '股票价格预测' },
        { emoji: '🗣️', label: 'NLP', content: '语言模型生成' },
      ],
    },
    backgroundUrl: '',
  },
];

// 示例背景图（使用占位图）
const PLACEHOLDER_BG = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop';

export default function CardTestPage() {
  const [cards, setCards] = useState(
    DEMO_CARDS.map(card => ({
      ...card,
      backgroundUrl: card.backgroundUrl || PLACEHOLDER_BG,
    }))
  );

  // 模拟 AI 生成背景
  const handleGenerateBackground = async (prompt: string): Promise<string> => {
    console.log('生成背景 Prompt:', prompt);
    // 实际项目中调用文生图 API
    // 这里返回示例图片
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `https://picsum.photos/400/600?random=${Date.now()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">卡片渲染测试</h1>
          <p className="text-gray-500 mt-1">
            新架构：背景板 + 文字分离，前端渲染合成
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <CardEditor
            cards={cards}
            onCardsChange={setCards}
            onGenerateBackground={handleGenerateBackground}
          />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
          <p className="font-medium mb-2">功能说明：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>拖拽文字区域调整位置</li>
            <li>滑动条调整底板透明度</li>
            <li>切换「选择背景」/「编辑内容」模式</li>
            <li>背景可上传、从库选择、或 AI 生成</li>
            <li>点击「导出图片」保存当前卡片</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
