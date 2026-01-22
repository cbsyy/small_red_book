import { create } from 'zustand';
import type { ParsedArticle, OutlineItem, GeneratedCard, CardStyle } from '@/types';

interface CardState {
  // 输入
  articleUrl: string;
  articleContent: string;
  articleTitle: string;

  // 解析结果
  parsedArticle: ParsedArticle | null;

  // 生成状态
  scraping: boolean;
  parsingOutline: boolean;
  generatingImages: boolean;

  // 卡片数据
  cards: GeneratedCard[];

  // 当前预览
  currentCardIndex: number;

  // 样式配置
  cardStyle: CardStyle;

  // Actions
  setArticleUrl: (url: string) => void;
  setArticleContent: (content: string) => void;
  setArticleTitle: (title: string) => void;
  setParsedArticle: (article: ParsedArticle | null) => void;
  setScraping: (scraping: boolean) => void;
  setParsingOutline: (parsing: boolean) => void;
  setGeneratingImages: (generating: boolean) => void;
  setCards: (cards: GeneratedCard[]) => void;
  updateCard: (index: number, card: Partial<GeneratedCard>) => void;
  setCurrentCardIndex: (index: number) => void;
  setCardStyle: (style: Partial<CardStyle>) => void;
  updateOutlineItem: (index: number, item: Partial<OutlineItem>) => void;
  reset: () => void;
}

const DEFAULT_CARD_STYLE: CardStyle = {
  width: 1080,
  height: 1440,
  backgroundColor: '#ffffff',
  overlayColor: '#000000',
  overlayOpacity: 0.4,
  titleFontSize: 48,
  titleColor: '#ffffff',
  contentFontSize: 32,
  contentColor: '#ffffff',
  fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  padding: 60,
};

export const useCardStore = create<CardState>((set) => ({
  // 初始状态
  articleUrl: '',
  articleContent: '',
  articleTitle: '',
  parsedArticle: null,
  scraping: false,
  parsingOutline: false,
  generatingImages: false,
  cards: [],
  currentCardIndex: 0,
  cardStyle: DEFAULT_CARD_STYLE,

  // Actions
  setArticleUrl: (url) => set({ articleUrl: url }),
  setArticleContent: (content) => set({ articleContent: content }),
  setArticleTitle: (title) => set({ articleTitle: title }),
  setParsedArticle: (article) => set({ parsedArticle: article }),
  setScraping: (scraping) => set({ scraping }),
  setParsingOutline: (parsing) => set({ parsingOutline: parsing }),
  setGeneratingImages: (generating) => set({ generatingImages: generating }),
  setCards: (cards) => set({ cards }),
  updateCard: (index, card) =>
    set((state) => ({
      cards: state.cards.map((c, i) => (i === index ? { ...c, ...card } : c)),
    })),
  setCurrentCardIndex: (index) => set({ currentCardIndex: index }),
  setCardStyle: (style) =>
    set((state) => ({
      cardStyle: { ...state.cardStyle, ...style },
    })),
  updateOutlineItem: (index, item) =>
    set((state) => {
      if (!state.parsedArticle) return state;
      const newOutline = [...state.parsedArticle.outline];
      newOutline[index] = { ...newOutline[index], ...item };
      return {
        parsedArticle: { ...state.parsedArticle, outline: newOutline },
      };
    }),
  reset: () =>
    set({
      articleUrl: '',
      articleContent: '',
      articleTitle: '',
      parsedArticle: null,
      scraping: false,
      parsingOutline: false,
      generatingImages: false,
      cards: [],
      currentCardIndex: 0,
    }),
}));
