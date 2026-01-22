'use client';

import { useState, useCallback } from 'react';
import { useDataStore } from '@/store';
import { parseExcelFile, parseCSVFile } from '@/lib/data/excel-parser';

export default function DataImport() {
  const { dataSource, setDataSource, selectedRowIndex, setSelectedRowIndex, clearData } = useDataStore();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let data;

      if (ext === 'xlsx' || ext === 'xls') {
        data = await parseExcelFile(file);
      } else if (ext === 'csv') {
        data = await parseCSVFile(file);
      } else {
        throw new Error('不支持的文件格式，请上传 Excel 或 CSV 文件');
      }

      setDataSource(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析文件失败');
    } finally {
      setLoading(false);
    }
  }, [setDataSource]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="h-full flex flex-col">
      <div className="panel-section">
        <div className="panel-title">数据源</div>

        {/* 上传区域 */}
        {!dataSource ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-accent bg-accent/5'
                : 'border-default hover:border-accent/50'
            }`}
          >
            {loading ? (
              <div className="animate-pulse">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted">解析中...</p>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-2">📊</div>
                <p className="text-sm text-secondary mb-2">
                  拖放 Excel/CSV 文件到此处
                </p>
                <p className="text-xs text-muted mb-4">或</p>
                <label className="btn btn-secondary cursor-pointer">
                  选择文件
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* 文件信息 */}
            <div className="flex items-center justify-between p-3 bg-tertiary rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm font-medium">{dataSource.fileName}</p>
                  <p className="text-xs text-muted">
                    {dataSource.columns.length} 列 · {dataSource.rows.length} 行
                  </p>
                </div>
              </div>
              <button
                onClick={clearData}
                className="btn btn-ghost text-xs text-red-500"
              >
                移除
              </button>
            </div>

            {/* 列名 */}
            <div>
              <p className="text-xs text-muted mb-2">可用变量：</p>
              <div className="flex flex-wrap gap-1">
                {dataSource.columns.map((col) => (
                  <code
                    key={col}
                    className="px-2 py-1 bg-secondary rounded text-xs"
                  >
                    {`{{${col}}}`}
                  </code>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* 数据预览 */}
      {dataSource && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="panel-section flex-shrink-0">
            <div className="panel-title">数据预览</div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>当前行: {selectedRowIndex + 1} / {dataSource.rows.length}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedRowIndex(Math.max(0, selectedRowIndex - 1))}
                  disabled={selectedRowIndex === 0}
                  className="btn btn-ghost p-1 disabled:opacity-50"
                >
                  ◀
                </button>
                <button
                  onClick={() => setSelectedRowIndex(Math.min(dataSource.rows.length - 1, selectedRowIndex + 1))}
                  disabled={selectedRowIndex === dataSource.rows.length - 1}
                  className="btn btn-ghost p-1 disabled:opacity-50"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="flex-1 overflow-auto p-4 pt-0">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-secondary p-2 text-left font-medium text-muted">#</th>
                  {dataSource.columns.map((col) => (
                    <th key={col} className="sticky top-0 bg-secondary p-2 text-left font-medium text-muted">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataSource.rows.slice(0, 100).map((row, index) => (
                  <tr
                    key={index}
                    onClick={() => setSelectedRowIndex(index)}
                    className={`cursor-pointer transition-colors ${
                      index === selectedRowIndex
                        ? 'bg-accent/10'
                        : 'hover:bg-tertiary'
                    }`}
                  >
                    <td className="p-2 text-muted">{index + 1}</td>
                    {dataSource.columns.map((col) => (
                      <td key={col} className="p-2 max-w-[150px] truncate">
                        {String(row[col] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {dataSource.rows.length > 100 && (
              <p className="text-center text-xs text-muted py-2">
                仅显示前 100 行...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
