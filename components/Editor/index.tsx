'use client';

import Canvas from './Canvas';
import Toolbar from './Toolbar';
import LayerPanel from './LayerPanel';
import PropertyPanel from './PropertyPanel';

export default function Editor() {
  return (
    <div className="editor-layout">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 左侧面板 */}
      <div className="editor-left-panel">
        <LayerPanel />
      </div>

      {/* 中间画布区域 */}
      <div className="editor-canvas-area">
        <Canvas />
      </div>

      {/* 右侧属性面板 */}
      <div className="editor-right-panel">
        <PropertyPanel />
      </div>
    </div>
  );
}

export { Canvas, Toolbar, LayerPanel, PropertyPanel };
