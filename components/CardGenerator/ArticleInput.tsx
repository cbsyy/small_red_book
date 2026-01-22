'use client';

import { useState } from 'react';
import { RiLinkM, RiLoader4Line, RiFileTextLine } from 'react-icons/ri';
import { useCardStore } from '@/store/useCardStore';

export default function ArticleInput() {
  const {
    articleUrl,
    setArticleUrl,
    setArticleContent,
    setArticleTitle,
    scraping,
    setScraping,
  } = useCardStore();

  const [error, setError] = useState('');

  const handleScrape = async () => {
    if (!articleUrl.trim()) {
      setError('请输入文章链接');
      return;
    }

    try {
      new URL(articleUrl);
    } catch {
      setError('请输入有效的链接');
      return;
    }

    setError('');
    setScraping(true);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: articleUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '抓取失败');
      }

      setArticleContent(data.data.content);
      setArticleTitle(data.data.title);
    } catch (err: any) {
      setError(err.message || '抓取失败，请稍后重试');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <RiLinkM className="text-xl" />
          </div>
          <input
            type="text"
            value={articleUrl}
            onChange={(e) => setArticleUrl(e.target.value)}
            placeholder="粘贴公众号、知乎、简书等文章链接..."
            className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-base outline-none focus:border-[#FF2442] focus:ring-2 focus:ring-[#FF2442]/10 transition-all"
            disabled={scraping}
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping || !articleUrl.trim()}
          className="h-14 px-8 bg-[#FF2442] text-white font-bold rounded-2xl hover:bg-[#E61E3B] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {scraping ? (
            <>
              <RiLoader4Line className="animate-spin" />
              抓取中...
            </>
          ) : (
            <>
              <RiFileTextLine />
              抓取文章
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 pl-2">{error}</p>
      )}

      <p className="text-xs text-gray-400 pl-2">
        支持微信公众号、知乎、简书、掘金等主流平台
      </p>
    </div>
  );
}
