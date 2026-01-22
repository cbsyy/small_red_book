import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import {
  CanvasElement,
  Template,
  CanvasSize,
  CANVAS_PRESETS,
  generateId,
} from '@/types';

interface EditorState {
  // 画布设置
  canvasSize: CanvasSize;
  backgroundColor: string;
  zoom: number;

  // 元素
  elements: CanvasElement[];
  selectedIds: string[];
  hoveredId: string | null;

  // 历史记录
  history: CanvasElement[][];
  historyIndex: number;

  // 模板
  templates: Template[];
  currentTemplateId: string | null;

  // Actions
  setCanvasSize: (size: CanvasSize) => void;
  setBackgroundColor: (color: string) => void;
  setZoom: (zoom: number) => void;

  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;

  setSelectedIds: (ids: string[]) => void;
  selectElement: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setHoveredId: (id: string | null) => void;

  moveElementUp: (id: string) => void;
  moveElementDown: (id: string) => void;
  moveElementToTop: (id: string) => void;
  moveElementToBottom: (id: string) => void;

  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  saveAsTemplate: (name: string, description?: string) => void;
  loadTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;

  clearCanvas: () => void;
  loadElements: (elements: CanvasElement[]) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      canvasSize: CANVAS_PRESETS[0],
      backgroundColor: '#ffffff',
      zoom: 1,
      elements: [],
      selectedIds: [],
      hoveredId: null,
      history: [[]],
      historyIndex: 0,
      templates: [],
      currentTemplateId: null,

      setCanvasSize: (size) => set({ canvasSize: size }),
      setBackgroundColor: (color) => set({ backgroundColor: color }),
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),

      addElement: (element) => {
        set(
          produce((state: EditorState) => {
            state.elements.push(element);
            state.selectedIds = [element.id];
          })
        );
        get().saveToHistory();
      },

      updateElement: (id, updates) => {
        set(
          produce((state: EditorState) => {
            const index = state.elements.findIndex((el) => el.id === id);
            if (index !== -1) {
              state.elements[index] = { ...state.elements[index], ...updates } as CanvasElement;
            }
          })
        );
      },

      deleteElement: (id) => {
        set(
          produce((state: EditorState) => {
            state.elements = state.elements.filter((el) => el.id !== id);
            state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
          })
        );
        get().saveToHistory();
      },

      duplicateElement: (id) => {
        const state = get();
        const element = state.elements.find((el) => el.id === id);
        if (element) {
          const newElement = {
            ...element,
            id: generateId(),
            x: element.x + 20,
            y: element.y + 20,
            name: `${element.name} 副本`,
          };
          state.addElement(newElement);
        }
      },

      setSelectedIds: (ids) => set({ selectedIds: ids }),

      selectElement: (id, multi = false) => {
        set(
          produce((state: EditorState) => {
            if (multi) {
              const index = state.selectedIds.indexOf(id);
              if (index === -1) {
                state.selectedIds.push(id);
              } else {
                state.selectedIds.splice(index, 1);
              }
            } else {
              state.selectedIds = [id];
            }
          })
        );
      },

      clearSelection: () => set({ selectedIds: [] }),
      setHoveredId: (id) => set({ hoveredId: id }),

      moveElementUp: (id) => {
        set(
          produce((state: EditorState) => {
            const index = state.elements.findIndex((el) => el.id === id);
            if (index < state.elements.length - 1) {
              [state.elements[index], state.elements[index + 1]] = [
                state.elements[index + 1],
                state.elements[index],
              ];
            }
          })
        );
        get().saveToHistory();
      },

      moveElementDown: (id) => {
        set(
          produce((state: EditorState) => {
            const index = state.elements.findIndex((el) => el.id === id);
            if (index > 0) {
              [state.elements[index], state.elements[index - 1]] = [
                state.elements[index - 1],
                state.elements[index],
              ];
            }
          })
        );
        get().saveToHistory();
      },

      moveElementToTop: (id) => {
        set(
          produce((state: EditorState) => {
            const index = state.elements.findIndex((el) => el.id === id);
            if (index !== -1) {
              const [element] = state.elements.splice(index, 1);
              state.elements.push(element);
            }
          })
        );
        get().saveToHistory();
      },

      moveElementToBottom: (id) => {
        set(
          produce((state: EditorState) => {
            const index = state.elements.findIndex((el) => el.id === id);
            if (index !== -1) {
              const [element] = state.elements.splice(index, 1);
              state.elements.unshift(element);
            }
          })
        );
        get().saveToHistory();
      },

      saveToHistory: () => {
        set(
          produce((state: EditorState) => {
            const newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push([...state.elements]);
            state.history = newHistory.slice(-50); // 保留最近50步
            state.historyIndex = state.history.length - 1;
          })
        );
      },

      undo: () => {
        set(
          produce((state: EditorState) => {
            if (state.historyIndex > 0) {
              state.historyIndex--;
              state.elements = [...state.history[state.historyIndex]];
              state.selectedIds = [];
            }
          })
        );
      },

      redo: () => {
        set(
          produce((state: EditorState) => {
            if (state.historyIndex < state.history.length - 1) {
              state.historyIndex++;
              state.elements = [...state.history[state.historyIndex]];
              state.selectedIds = [];
            }
          })
        );
      },

      saveAsTemplate: (name, description) => {
        const state = get();
        const template: Template = {
          id: generateId(),
          name,
          description,
          canvasSize: state.canvasSize,
          backgroundColor: state.backgroundColor,
          elements: [...state.elements],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set(
          produce((state: EditorState) => {
            state.templates.push(template);
            state.currentTemplateId = template.id;
          })
        );
      },

      loadTemplate: (templateId) => {
        const state = get();
        const template = state.templates.find((t) => t.id === templateId);
        if (template) {
          set({
            canvasSize: template.canvasSize,
            backgroundColor: template.backgroundColor,
            elements: [...template.elements],
            selectedIds: [],
            currentTemplateId: templateId,
          });
          get().saveToHistory();
        }
      },

      deleteTemplate: (templateId) => {
        set(
          produce((state: EditorState) => {
            state.templates = state.templates.filter((t) => t.id !== templateId);
            if (state.currentTemplateId === templateId) {
              state.currentTemplateId = null;
            }
          })
        );
      },

      clearCanvas: () => {
        set({ elements: [], selectedIds: [] });
        get().saveToHistory();
      },

      loadElements: (elements) => {
        set({ elements, selectedIds: [] });
        get().saveToHistory();
      },
    }),
    {
      name: 'editor-store',
      partialize: (state) => ({
        templates: state.templates,
        canvasSize: state.canvasSize,
        backgroundColor: state.backgroundColor,
      }),
    }
  )
);
