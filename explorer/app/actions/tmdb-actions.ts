"use server";

import { readFile, writeFile, mkdir, readdir, unlink, stat } from "fs/promises";
import { join } from "path";

// TMDB 配置类型
interface TmdbConfig {
  apiKey: string;
  language: string;
  baseUrl: string;
}

// TMDB 搜索结果类型
interface TmdbSearchResult {
  id: number;
  name?: string;
  title?: string;
  original_name?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  release_date?: string;
  vote_average?: number;
  media_type?: string;
}

// TMDB 详情类型
interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  origin_country?: string[];
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  status?: string;
  tagline?: string;
  production_companies?: {
    id: number;
    name: string;
    logo_path?: string | null;
  }[];
}

// 持久化数据根目录（Docker 中通过 volume 挂载实现持久化）
const DATA_DIR = process.env.NEXT_PUBLIC_DATA_DIR || process.cwd();
const CACHE_DIR = join(DATA_DIR, "cache", "tmdb");
const CONFIG_DIR = join(DATA_DIR, "config");
const CONFIG_PATH = join(CONFIG_DIR, "tmdb.json");

// 默认配置
const DEFAULT_CONFIG: TmdbConfig = {
  apiKey: "",
  language: "zh-CN",
  baseUrl: "https://api.themoviedb.org/3",
};

// 读取 TMDB 配置
async function getTmdbConfig(): Promise<TmdbConfig> {
  try {
    const content = await readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch {
    // 配置文件不存在时返回默认配置
    return { ...DEFAULT_CONFIG };
  }
}

// 保存 TMDB 配置
async function saveTmdbConfig(config: TmdbConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// 获取 TMDB 配置（供前端读取）
export async function getTmdbConfigAction(): Promise<{
  apiKey: string;
  language: string;
  baseUrl: string;
}> {
  const config = await getTmdbConfig();
  return {
    apiKey: config.apiKey,
    language: config.language,
    baseUrl: config.baseUrl,
  };
}

// 保存 TMDB API Key（供前端调用）
export async function saveTmdbApiKeyAction(apiKey: string): Promise<void> {
  const config = await getTmdbConfig();
  config.apiKey = apiKey;
  await saveTmdbConfig(config);
}

// 保存完整 TMDB 配置（供前端调用）
export async function saveTmdbConfigAction(config: {
  apiKey: string;
  language: string;
  baseUrl: string;
}): Promise<void> {
  await saveTmdbConfig(config);
}

// 缓存工具
async function getCached<T>(key: string): Promise<T | null> {
  try {
    const filePath = join(CACHE_DIR, `${key}.json`);
    const content = await readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    // 缓存有效期 24 小时
    if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
      return data.result as T;
    }
    return null;
  } catch {
    return null;
  }
}

async function setCache(key: string, result: unknown): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const filePath = join(CACHE_DIR, `${key}.json`);
    await writeFile(
      filePath,
      JSON.stringify({ timestamp: Date.now(), result }, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.error("缓存写入失败:", err);
  }
}

// 搜索 TMDB
export async function searchTmdbAction(
  query: string,
  year?: string,
  mediaType?: "movie" | "tv",
): Promise<{ results: TmdbSearchResult[] }> {
  const config = await getTmdbConfig();

  if (!config.apiKey) {
    throw new Error("请先配置 TMDB API Key（点击设置按钮）");
  }

  const cacheKey = `search-${query}-${year || ""}-${mediaType || ""}`;
  const cached = await getCached<{ results: TmdbSearchResult[] }>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    api_key: config.apiKey,
    language: config.language,
    query,
  });

  if (year) {
    params.append(mediaType === "tv" ? "first_air_date_year" : "year", year);
  }

  const endpoint = mediaType ? `/search/${mediaType}` : "/search/multi";

  const response = await fetch(
    `${config.baseUrl}${endpoint}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`TMDB API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  const result = { results: data.results || [] };

  await setCache(cacheKey, result);
  return result;
}

// 获取 TMDB 详情
export async function getTmdbDetailAction(
  id: number,
  mediaType: "movie" | "tv",
): Promise<TmdbDetail> {
  const config = await getTmdbConfig();

  if (!config.apiKey) {
    throw new Error("请先配置 TMDB API Key（点击设置按钮）");
  }

  const cacheKey = `detail-${mediaType}-${id}`;
  const cached = await getCached<TmdbDetail>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    api_key: config.apiKey,
    language: config.language,
  });

  const response = await fetch(
    `${config.baseUrl}/${mediaType}/${id}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`TMDB API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  await setCache(cacheKey, data);
  return data;
}

// 缓存项信息
export interface TmdbCacheItem {
  fileName: string; // 文件名（不含扩展名）
  type: "search" | "detail" | "unknown"; // 缓存类型
  size: number; // 文件大小（字节）
  createdAt: number; // 缓存时间戳
  expired: boolean; // 是否已过期
}

// 列出所有 TMDB 缓存
export async function listTmdbCacheAction(): Promise<TmdbCacheItem[]> {
  try {
    const files = await readdir(CACHE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const items: TmdbCacheItem[] = await Promise.all(
      jsonFiles.map(async (fileName) => {
        const filePath = join(CACHE_DIR, fileName);
        const fileStat = await stat(filePath);
        const content = await readFile(filePath, "utf-8");
        const data = JSON.parse(content);
        const nameWithoutExt = fileName.replace(/\.json$/, "");
        const type = nameWithoutExt.startsWith("search-")
          ? "search"
          : nameWithoutExt.startsWith("detail-")
            ? "detail"
            : "unknown";
        const expired = Date.now() - data.timestamp >= 24 * 60 * 60 * 1000;

        return {
          fileName: nameWithoutExt,
          type,
          size: fileStat.size,
          createdAt: data.timestamp,
          expired,
        };
      }),
    );

    // 按创建时间倒序
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

// 删除单个缓存文件
export async function deleteTmdbCacheAction(fileName: string): Promise<void> {
  const filePath = join(CACHE_DIR, `${fileName}.json`);
  await unlink(filePath);
}

// 清空所有缓存
export async function clearAllTmdbCacheAction(): Promise<number> {
  try {
    const files = await readdir(CACHE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    await Promise.all(
      jsonFiles.map((f) => unlink(join(CACHE_DIR, f))),
    );
    return jsonFiles.length;
  } catch {
    return 0;
  }
}
