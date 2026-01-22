'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { RiRefreshLine, RiSettings4Line } from 'react-icons/ri';
import { useCreationStore } from '@/store/useCreationStore';
import HeroSection from '@/components/home/HeroSection';
import Workspace from '@/components/workspace/Workspace';

// 在线背景图片 URL
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2000&auto=format&fit=crop', // 意大利海岸
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop', // 热带海滩
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2000&auto=format&fit=crop', // 山间森林
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=2000&auto=format&fit=crop', // 城市夜景
  'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=2000&auto=format&fit=crop', // 樱花盛开
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2000&auto=format&fit=crop', // 星空银河
];

export default function Home() {
  const { step, reset } = useCreationStore();

  const [currentBgIdx, setCurrentBgIdx] = useState(0);
  const [activeLayer, setActiveLayer] = useState(0);
  const bgContainerRef = useRef<HTMLDivElement>(null);

  const isWorkspaceActive = step !== 'idle';

  // 切换背景
  const changeBackground = () => {
    const next = (currentBgIdx + 1) % BG_IMAGES.length;
    setCurrentBgIdx(next);
    setActiveLayer(1 - activeLayer);
  };

  // 视差效果
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (bgContainerRef.current) {
        const x = (window.innerWidth / 2 - e.pageX) / 80;
        const y = (window.innerHeight / 2 - e.pageY) / 80;
        bgContainerRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 滚动到 Workspace
  const scrollToWorkspace = () => {
    setTimeout(() => {
      const workspaceEl = document.getElementById('workspace');
      if (workspaceEl) {
        workspaceEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // 重置流程
  const handleReset = () => {
    reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden relative">
      {/* 背景系统 - 最底层 */}
      <div className="fixed inset-0 z-0 bg-black">
        <div
          ref={bgContainerRef}
          className="absolute -top-[5%] -left-[5%] w-[110%] h-[110%]"
          style={{
            transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        >
          <div
            className={`absolute inset-0 bg-cover bg-center ${
              activeLayer === 0 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url('${BG_IMAGES[currentBgIdx]}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.9)',
              transition: 'opacity 1.2s ease-in-out',
            }}
          />
          <div
            className={`absolute inset-0 bg-cover bg-center ${
              activeLayer === 1 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url('${BG_IMAGES[(currentBgIdx + 1) % BG_IMAGES.length]}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.9)',
              transition: 'opacity 1.2s ease-in-out',
            }}
          />
        </div>
      </div>

      {/* 毛玻璃遮罩层 */}
      <div
        className="fixed inset-0 z-10 backdrop-blur-[8px]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 100%)',
        }}
      />

      {/* 顶部导航 */}
      <header className="fixed top-0 w-full px-8 md:px-15 py-8 flex justify-between items-center z-50">
        <div
          className="font-['Playfair_Display',serif] text-[28px] font-bold tracking-tight text-gray-900 cursor-pointer"
          onClick={handleReset}
        >
          YuLu
        </div>
        <nav className="flex items-center gap-9">
          <Link
            href="#"
            className="text-gray-900 font-semibold text-[15px] opacity-70 hover:opacity-100 hover:text-[#FF2442] transition-all"
          >
            功能
          </Link>
          <Link
            href="#"
            className="text-gray-900 font-semibold text-[15px] opacity-70 hover:opacity-100 hover:text-[#FF2442] transition-all"
          >
            价格
          </Link>
          <Link
            href="#"
            className="text-gray-900 font-semibold text-[15px] opacity-70 hover:opacity-100 hover:text-[#FF2442] transition-all"
          >
            关于
          </Link>
          <Link
            href="/admin/settings"
            className="text-gray-900 font-semibold text-[15px] opacity-70 hover:opacity-100 hover:text-[#FF2442] transition-all flex items-center gap-1"
          >
            <RiSettings4Line />
            配置管理
          </Link>
          <button
            onClick={changeBackground}
            title="切换背景"
            className="w-11 h-11 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 hover:rotate-180 transition-all duration-500 text-[#FF2442]"
          >
            <RiRefreshLine className="text-lg" />
          </button>
        </nav>
      </header>

      {/* 主内容区 */}
      <main className="relative z-20 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Hero 区域 */}
        <HeroSection onWorkspaceStart={scrollToWorkspace} />

        {/* Workspace 区域 */}
        <Workspace isVisible={isWorkspaceActive} />
      </main>

      {/* 页脚 */}
      <footer className="fixed bottom-8 w-full text-center text-[13px] text-gray-500 font-semibold z-20">
        © 2026 YuLu AI. 创意无限。
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

        @keyframes heroReveal {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
