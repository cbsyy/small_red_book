import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DataSource, DataRow } from '@/types';

interface DataState {
  dataSource: DataSource | null;
  selectedRowIndex: number;

  // Actions
  setDataSource: (data: DataSource | null) => void;
  setSelectedRowIndex: (index: number) => void;
  updateRow: (index: number, updates: Partial<DataRow>) => void;
  deleteRow: (index: number) => void;
  addRow: (row: DataRow) => void;
  clearData: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      dataSource: null,
      selectedRowIndex: 0,

      setDataSource: (data) => set({ dataSource: data, selectedRowIndex: 0 }),

      setSelectedRowIndex: (index) => set({ selectedRowIndex: index }),

      updateRow: (index, updates) =>
        set((state) => {
          if (!state.dataSource) return state;
          const newRows = [...state.dataSource.rows];
          newRows[index] = { ...newRows[index], ...updates } as DataRow;
          return {
            dataSource: { ...state.dataSource, rows: newRows },
          };
        }),

      deleteRow: (index) =>
        set((state) => {
          if (!state.dataSource) return state;
          const newRows = state.dataSource.rows.filter((_, i) => i !== index);
          return {
            dataSource: { ...state.dataSource, rows: newRows },
            selectedRowIndex: Math.min(state.selectedRowIndex, newRows.length - 1),
          };
        }),

      addRow: (row) =>
        set((state) => {
          if (!state.dataSource) return state;
          return {
            dataSource: {
              ...state.dataSource,
              rows: [...state.dataSource.rows, row],
            },
          };
        }),

      clearData: () => set({ dataSource: null, selectedRowIndex: 0 }),
    }),
    {
      name: 'data-store',
    }
  )
);
