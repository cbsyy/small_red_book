'use client';

import { useEditorStore } from '@/store';

// 图标
const Icons = {
  Eye: ({ visible }: { visible: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity={visible ? 1 : 0.4}>
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  ),
  Lock: ({ locked }: { locked: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity={locked ? 1 : 0.4}>
      {locked ? (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </>
      ) : (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 019.9-1" />
        </>
      )}
    </svg>
  ),
  Delete: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  Text: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  ),
  Image: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  Rect: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  ),
};

export default function LayerPanel() {
  const {
    elements,
    selectedIds,
    selectElement,
    updateElement,
    deleteElement,
    moveElementUp,
    moveElementDown,
  } = useEditorStore();

  // 从下到上显示（越后面的在越上层）
  const reversedElements = [...elements].reverse();

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Icons.Text />;
      case 'image':
        return <Icons.Image />;
      case 'rect':
      case 'circle':
        return <Icons.Rect />;
      default:
        return <Icons.Rect />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="panel-section">
        <div className="panel-title">图层</div>

        {elements.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">
            暂无图层<br />
            <span className="text-xs">在工具栏添加元素</span>
          </div>
        ) : (
          <div className="space-y-1">
            {reversedElements.map((element) => {
              const isSelected = selectedIds.includes(element.id);
              return (
                <div
                  key={element.id}
                  onClick={() => selectElement(element.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-accent/10 border border-accent/30'
                      : 'hover:bg-tertiary'
                  }`}
                >
                  {/* 图标 */}
                  <span className="text-muted">{getElementIcon(element.type)}</span>

                  {/* 名称 */}
                  <span className="flex-1 text-sm truncate">{element.name}</span>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateElement(element.id, { visible: !element.visible });
                      }}
                      className="p-1 hover:bg-secondary rounded"
                      title={element.visible ? '隐藏' : '显示'}
                    >
                      <Icons.Eye visible={element.visible} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateElement(element.id, { locked: !element.locked });
                      }}
                      className="p-1 hover:bg-secondary rounded"
                      title={element.locked ? '解锁' : '锁定'}
                    >
                      <Icons.Lock locked={element.locked} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(element.id);
                      }}
                      className="p-1 hover:bg-red-100 hover:text-red-500 rounded"
                      title="删除"
                    >
                      <Icons.Delete />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
