'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Textbox, FabricImage, Circle, Line, FabricObject } from 'fabric';
import { useEditorStore } from '@/store';
import { CanvasElement, TextElement, ImageElement, RectElement } from '@/types';

interface CanvasProps {
  width?: number;
  height?: number;
}

export default function Canvas({ width, height }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  const {
    canvasSize,
    backgroundColor,
    zoom,
    elements,
    selectedIds,
    updateElement,
    setSelectedIds,
    clearSelection,
  } = useEditorStore();

  const canvasWidth = width || canvasSize.width;
  const canvasHeight = height || canvasSize.height;

  // 初始化 Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // 选择事件
    canvas.on('selection:created', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedIds(ids);
    });

    canvas.on('selection:updated', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedIds(ids);
    });

    canvas.on('selection:cleared', () => {
      clearSelection();
    });

    // 对象修改事件
    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (!obj) return;

      const id = obj.get('id') as string;
      if (!id) return;

      updateElement(id, {
        x: obj.left || 0,
        y: obj.top || 0,
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1),
        rotation: obj.angle || 0,
      });
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [canvasWidth, canvasHeight]);

  // 更新背景色
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = backgroundColor;
      fabricRef.current.renderAll();
    }
  }, [backgroundColor]);

  // 同步元素到画布
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // 清除所有对象
    canvas.clear();
    canvas.backgroundColor = backgroundColor;

    // 添加元素
    elements.forEach((element) => {
      const obj = createFabricObject(element);
      if (obj) {
        obj.set('id', element.id);
        canvas.add(obj);
      }
    });

    canvas.renderAll();
  }, [elements, backgroundColor]);

  // 更新缩放
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setZoom(zoom);
      fabricRef.current.setDimensions({
        width: canvasWidth * zoom,
        height: canvasHeight * zoom,
      });
    }
  }, [zoom, canvasWidth, canvasHeight]);

  return (
    <div className="canvas-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// 创建 Fabric 对象
function createFabricObject(element: CanvasElement): FabricObject | null {
  switch (element.type) {
    case 'text': {
      const textEl = element as TextElement;
      return new Textbox(textEl.text, {
        left: textEl.x,
        top: textEl.y,
        width: textEl.width,
        fontSize: textEl.fontSize,
        fontFamily: textEl.fontFamily,
        fontWeight: textEl.fontWeight,
        fontStyle: textEl.fontStyle,
        textAlign: textEl.textAlign,
        fill: textEl.fill,
        lineHeight: textEl.lineHeight,
        angle: textEl.rotation,
        opacity: textEl.opacity,
        selectable: !textEl.locked,
        visible: textEl.visible,
      });
    }

    case 'rect': {
      const rectEl = element as RectElement;
      return new Rect({
        left: rectEl.x,
        top: rectEl.y,
        width: rectEl.width,
        height: rectEl.height,
        fill: rectEl.fill,
        stroke: rectEl.stroke,
        strokeWidth: rectEl.strokeWidth,
        rx: rectEl.cornerRadius,
        ry: rectEl.cornerRadius,
        angle: rectEl.rotation,
        opacity: rectEl.opacity,
        selectable: !rectEl.locked,
        visible: rectEl.visible,
      });
    }

    case 'image': {
      const imgEl = element as ImageElement;
      if (!imgEl.src) {
        // 创建占位符
        return new Rect({
          left: imgEl.x,
          top: imgEl.y,
          width: imgEl.width,
          height: imgEl.height,
          fill: '#f0f0f0',
          stroke: '#ddd',
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          angle: imgEl.rotation,
          opacity: imgEl.opacity,
          selectable: !imgEl.locked,
          visible: imgEl.visible,
        });
      }
      // 图片加载是异步的，这里返回占位符
      return new Rect({
        left: imgEl.x,
        top: imgEl.y,
        width: imgEl.width,
        height: imgEl.height,
        fill: '#e5e5e5',
        angle: imgEl.rotation,
        opacity: imgEl.opacity,
        selectable: !imgEl.locked,
        visible: imgEl.visible,
      });
    }

    case 'circle': {
      return new Circle({
        left: element.x,
        top: element.y,
        radius: Math.min(element.width, element.height) / 2,
        fill: (element as any).fill || '#e5e5e5',
        stroke: (element as any).stroke,
        strokeWidth: (element as any).strokeWidth || 0,
        angle: element.rotation,
        opacity: element.opacity,
        selectable: !element.locked,
        visible: element.visible,
      });
    }

    default:
      return null;
  }
}
