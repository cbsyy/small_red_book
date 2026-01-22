import fs from 'fs';
import path from 'path';

// 模型配置类型 - 支持多供应商
export interface ModelConfig {
  id: string;
  provider: string;       // 供应商类型：openai | gemini | qwen | modelscope | deepseek | zhipu | azure | custom
  alias: string;          // 唯一别名，如 "GPT-4o 主力", "Ollama Llama3"
  baseURL: string;        // API 地址，如 "https://api.openai.com/v1" 或 "http://localhost:11434/v1"
  apiKey: string;         // API 密钥，ollama 本地可以为空
  model: string;          // 模型 ID，如 "gpt-4o", "llama3"
  enabled: boolean;
  priority: number;       // 优先级，数字越小越优先
  createdAt: string;
  updatedAt: string;
}

// 存储文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const MODELS_FILE = path.join(DATA_DIR, 'models.json');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 读取所有模型配置
export function getModels(): ModelConfig[] {
  ensureDataDir();
  if (!fs.existsSync(MODELS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(MODELS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 保存所有模型配置
function saveModels(models: ModelConfig[]) {
  ensureDataDir();
  fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2), 'utf-8');
}

// 获取单个模型
export function getModelById(id: string): ModelConfig | null {
  const models = getModels();
  return models.find(m => m.id === id) || null;
}

// 获取启用的模型（按优先级排序，优先级越小越靠前）
export function getEnabledModels(): ModelConfig[] {
  return getModels()
    .filter(m => m.enabled)
    .sort((a, b) => a.priority - b.priority);
}

// 创建模型
export function createModel(data: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): ModelConfig {
  const models = getModels();

  // 检查别名是否重复
  if (models.some(m => m.alias === data.alias)) {
    throw new Error('别名已存在');
  }

  const now = new Date().toISOString();
  const newModel: ModelConfig = {
    ...data,
    id: generateId(),
    priority: data.priority ?? models.length, // 默认排在最后
    createdAt: now,
    updatedAt: now,
  };

  models.push(newModel);
  saveModels(models);
  return newModel;
}

// 更新模型
export function updateModel(id: string, data: Partial<ModelConfig>): ModelConfig | null {
  const models = getModels();
  const index = models.findIndex(m => m.id === id);

  if (index === -1) {
    return null;
  }

  // 检查别名是否重复（排除自己）
  if (data.alias && models.some(m => m.alias === data.alias && m.id !== id)) {
    throw new Error('别名已存在');
  }

  models[index] = {
    ...models[index],
    ...data,
    id, // 确保 id 不变
    updatedAt: new Date().toISOString(),
  };

  saveModels(models);
  return models[index];
}

// 删除模型
export function deleteModel(id: string): boolean {
  const models = getModels();
  const index = models.findIndex(m => m.id === id);

  if (index === -1) {
    return false;
  }

  models.splice(index, 1);
  saveModels(models);
  return true;
}

// 生成唯一 ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// 预设模型配置（方便快速添加）
export const MODEL_PRESETS = [
  {
    provider: 'openai',
    alias: 'OpenAI GPT-4o',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
  {
    provider: 'openai',
    alias: 'OpenAI GPT-4o-mini',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  {
    provider: 'deepseek',
    alias: 'DeepSeek Chat',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    provider: 'qwen',
    alias: '通义千问 Plus',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  {
    provider: 'zhipu',
    alias: '智谱 GLM-4-Flash',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
  },
  {
    provider: 'custom',
    alias: 'Ollama Llama3',
    baseURL: 'http://localhost:11434/v1',
    model: 'llama3',
  },
  {
    provider: 'custom',
    alias: 'Ollama Qwen2',
    baseURL: 'http://localhost:11434/v1',
    model: 'qwen2',
  },
];
