import * as XLSX from 'xlsx';
import { DataSource, DataRow } from '@/types';

export function parseExcelFile(file: File): Promise<DataSource> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // 获取第一个工作表
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 转换为 JSON
        const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet, {
          defval: '', // 默认值为空字符串
        });

        if (jsonData.length === 0) {
          reject(new Error('Excel 文件为空'));
          return;
        }

        // 获取列名
        const columns = Object.keys(jsonData[0]);

        resolve({
          columns,
          rows: jsonData,
          fileName: file.name,
        });
      } catch (error) {
        reject(new Error('解析 Excel 文件失败'));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function parseCSVFile(file: File): Promise<DataSource> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          reject(new Error('CSV 文件为空或格式错误'));
          return;
        }

        // 解析表头
        const columns = parseCSVLine(lines[0]);

        // 解析数据行
        const rows: DataRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: DataRow = {};
          columns.forEach((col, index) => {
            row[col] = values[index] || '';
          });
          rows.push(row);
        }

        resolve({
          columns,
          rows,
          fileName: file.name,
        });
      } catch (error) {
        reject(new Error('解析 CSV 文件失败'));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsText(file);
  });
}

// 解析 CSV 行（处理引号）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// 替换模板中的变量
export function replaceVariables(template: string, data: DataRow): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });
}

// 提取模板中的变量名
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}
