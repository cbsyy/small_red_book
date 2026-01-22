'use client';

import { useEditorStore, useDataStore } from '@/store';
import { TextElement, ImageElement, RectElement, CanvasElement } from '@/types';

export default function PropertyPanel() {
  const { elements, selectedIds, updateElement, backgroundColor, setBackgroundColor } = useEditorStore();
  const { dataSource } = useDataStore();

  const selectedElement = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0])
    : null;

  if (!selectedElement) {
    return (
      <div className="h-full">
        {/* 画布属性 */}
        <div className="panel-section">
          <div className="panel-title">画布</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted block mb-1">背景色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-8 h-8 rounded border border-default cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="input flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="text-center py-8 text-muted text-sm">
            选择一个元素<br />
            <span className="text-xs">查看和编辑属性</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* 基础属性 */}
      <div className="panel-section">
        <div className="panel-title">基础属性</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">名称</label>
            <input
              type="text"
              value={selectedElement.name}
              onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted block mb-1">X</label>
              <input
                type="number"
                value={Math.round(selectedElement.x)}
                onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Y</label>
              <input
                type="number"
                value={Math.round(selectedElement.y)}
                onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted block mb-1">宽度</label>
              <input
                type="number"
                value={Math.round(selectedElement.width)}
                onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">高度</label>
              <input
                type="number"
                value={Math.round(selectedElement.height)}
                onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">旋转 ({selectedElement.rotation}°)</label>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedElement.rotation}
              onChange={(e) => updateElement(selectedElement.id, { rotation: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">透明度 ({Math.round(selectedElement.opacity * 100)}%)</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedElement.opacity}
              onChange={(e) => updateElement(selectedElement.id, { opacity: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 文字属性 */}
      {selectedElement.type === 'text' && (
        <TextProperties element={selectedElement as TextElement} updateElement={updateElement} dataSource={dataSource} />
      )}

      {/* 图片属性 */}
      {selectedElement.type === 'image' && (
        <ImageProperties element={selectedElement as ImageElement} updateElement={updateElement} dataSource={dataSource} />
      )}

      {/* 矩形属性 */}
      {selectedElement.type === 'rect' && (
        <RectProperties element={selectedElement as RectElement} updateElement={updateElement} />
      )}
    </div>
  );
}

// 文字属性面板
function TextProperties({ element, updateElement, dataSource }: {
  element: TextElement;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  dataSource: any;
}) {
  return (
    <div className="panel-section">
      <div className="panel-title">文字</div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted block mb-1">内容</label>
          <textarea
            value={element.text}
            onChange={(e) => updateElement(element.id, { text: e.target.value } as any)}
            className="input min-h-[80px] resize-none"
            placeholder="输入文字或使用 {{变量名}}"
          />
        </div>

        {dataSource && (
          <div>
            <label className="text-xs text-muted block mb-1">绑定数据列</label>
            <select
              value={element.bindingField || ''}
              onChange={(e) => updateElement(element.id, { bindingField: e.target.value || undefined } as any)}
              className="select"
            >
              <option value="">不绑定</option>
              {dataSource.columns.map((col: string) => (
                <option key={col} value={`{{${col}}}`}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted block mb-1">字号</label>
            <input
              type="number"
              value={element.fontSize}
              onChange={(e) => updateElement(element.id, { fontSize: Number(e.target.value) } as any)}
              className="input"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">颜色</label>
            <input
              type="color"
              value={element.fill}
              onChange={(e) => updateElement(element.id, { fill: e.target.value } as any)}
              className="w-full h-9 rounded border border-default cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">字体</label>
          <select
            value={element.fontFamily}
            onChange={(e) => updateElement(element.id, { fontFamily: e.target.value } as any)}
            className="select"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Microsoft YaHei">微软雅黑</option>
            <option value="SimHei">黑体</option>
            <option value="SimSun">宋体</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => updateElement(element.id, { fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' } as any)}
            className={`btn btn-secondary flex-1 ${element.fontWeight === 'bold' ? 'bg-accent text-white' : ''}`}
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => updateElement(element.id, { fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' } as any)}
            className={`btn btn-secondary flex-1 ${element.fontStyle === 'italic' ? 'bg-accent text-white' : ''}`}
          >
            <em>I</em>
          </button>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">对齐</label>
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => updateElement(element.id, { textAlign: align } as any)}
                className={`btn btn-secondary flex-1 ${element.textAlign === align ? 'bg-accent text-white' : ''}`}
              >
                {align === 'left' ? '左' : align === 'center' ? '中' : '右'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 图片属性面板
function ImageProperties({ element, updateElement, dataSource }: {
  element: ImageElement;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  dataSource: any;
}) {
  return (
    <div className="panel-section">
      <div className="panel-title">图片</div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted block mb-1">图片地址</label>
          <input
            type="text"
            value={element.src}
            onChange={(e) => updateElement(element.id, { src: e.target.value } as any)}
            className="input"
            placeholder="输入图片URL或使用 {{变量名}}"
          />
        </div>

        {dataSource && (
          <div>
            <label className="text-xs text-muted block mb-1">绑定数据列</label>
            <select
              value={element.bindingField || ''}
              onChange={(e) => updateElement(element.id, { bindingField: e.target.value || undefined } as any)}
              className="select"
            >
              <option value="">不绑定</option>
              {dataSource.columns.map((col: string) => (
                <option key={col} value={`{{${col}}}`}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted block mb-1">填充方式</label>
          <select
            value={element.fit}
            onChange={(e) => updateElement(element.id, { fit: e.target.value as any } as any)}
            className="select"
          >
            <option value="cover">覆盖 (Cover)</option>
            <option value="contain">适应 (Contain)</option>
            <option value="fill">拉伸 (Fill)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// 矩形属性面板
function RectProperties({ element, updateElement }: {
  element: RectElement;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
}) {
  return (
    <div className="panel-section">
      <div className="panel-title">矩形</div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted block mb-1">填充色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={element.fill}
              onChange={(e) => updateElement(element.id, { fill: e.target.value } as any)}
              className="w-8 h-8 rounded border border-default cursor-pointer"
            />
            <input
              type="text"
              value={element.fill}
              onChange={(e) => updateElement(element.id, { fill: e.target.value } as any)}
              className="input flex-1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">边框色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={element.stroke}
              onChange={(e) => updateElement(element.id, { stroke: e.target.value } as any)}
              className="w-8 h-8 rounded border border-default cursor-pointer"
            />
            <input
              type="text"
              value={element.stroke}
              onChange={(e) => updateElement(element.id, { stroke: e.target.value } as any)}
              className="input flex-1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">边框宽度</label>
          <input
            type="number"
            value={element.strokeWidth}
            onChange={(e) => updateElement(element.id, { strokeWidth: Number(e.target.value) } as any)}
            className="input"
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">圆角</label>
          <input
            type="number"
            value={element.cornerRadius}
            onChange={(e) => updateElement(element.id, { cornerRadius: Number(e.target.value) } as any)}
            className="input"
          />
        </div>
      </div>
    </div>
  );
}
