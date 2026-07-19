/**
 * 媒体库整理工具函数
 * 根据 TMDB 信息计算分类和目标路径
 */

// TMDB 详情中与分类相关的字段
export interface MediaClassifyInfo {
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  origin_country?: string[];
  release_date?: string;
  first_air_date?: string;
  genres?: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  vote_average?: number;
  production_companies?: { id: number; name: string }[];
}

// 媒体技术参数（从文件名解析）
export interface MediaTechInfo {
  screen_size?: string;
  audio_codec?: string;
  source?: string;
  video_codec?: string;
  color_depth?: string;
}

// 媒体分类
export type MediaCategory =
  | "动漫"
  | "动画电影"
  | "华语电影"
  | "外语电影"
  | "电视剧"; // 电视剧作为父目录

// 电视剧子分类
export type TvSubCategory = "国产剧" | "欧美剧" | "日韩剧" | "其他";

// TMDB 动画类型 ID
const ANIMATION_GENRE_ID = 16;
// TMDB 动画相关类型 ID（日本动漫通常也归在 Animation 下）
const ANIME_GENRE_IDS = [16];

// 华语国家/地区代码
const CHINESE_COUNTRIES = ["CN", "HK", "TW"];
// 日韩国家代码
const JP_KR_COUNTRIES = ["JP", "KR"];
// 欧美国家代码（常见）
const WESTERN_COUNTRIES = [
  "US",
  "GB",
  "FR",
  "DE",
  "ES",
  "IT",
  "CA",
  "AU",
  "NZ",
  "IE",
];

/**
 * 判断电影分类
 */
export function classifyMovie(info: MediaClassifyInfo): MediaCategory {
  const genres = info.genres || [];
  const genreIds = genres.map((g) => g.id);
  const genreNames = genres.map((g) => g.name.toLowerCase());
  const originCountry = info.origin_country || [];
  const originalLanguage = info.original_language;

  // 判断是否是动画电影（包括日本动漫电影）
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);

  if (isAnimation) return "动画电影";

  // 华语电影
  const isChinese =
    originCountry.some((c) => CHINESE_COUNTRIES.includes(c)) ||
    originalLanguage === "zh";

  if (isChinese) return "华语电影";

  return "外语电影";
}

/**
 * 判断电视剧分类
 */
export function classifyTvShow(info: MediaClassifyInfo): TvSubCategory {
  const genres = info.genres || [];
  const genreIds = genres.map((g) => g.id);
  const originCountry = info.origin_country || [];
  const originalLanguage = info.original_language;

  // 判断是否是动漫连续剧（动画类型 + 日本）
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isAnime =
    isAnimation &&
    (originCountry.includes("JP") || originalLanguage === "ja");

  if (isAnime) return "动漫" as TvSubCategory; // 特殊处理

  // 国产剧
  if (
    originCountry.some((c) => CHINESE_COUNTRIES.includes(c)) ||
    originalLanguage === "zh"
  ) {
    return "国产剧";
  }

  // 日韩剧
  if (originCountry.some((c) => JP_KR_COUNTRIES.includes(c))) {
    return "日韩剧";
  }

  // 欧美剧
  if (originCountry.some((c) => WESTERN_COUNTRIES.includes(c))) {
    return "欧美剧";
  }

  return "其他";
}

/**
 * 根据 TMDB 信息获取分类
 */
export function classifyMedia(
  mediaType: "movie" | "tv",
  info: MediaClassifyInfo,
): MediaCategory | TvSubCategory {
  if (mediaType === "movie") {
    return classifyMovie(info);
  }
  return classifyTvShow(info);
}

/**
 * 获取年份
 */
function getYear(info: MediaClassifyInfo): string {
  const date = info.release_date || info.first_air_date;
  if (!date) return "";
  return date.slice(0, 4);
}

/**
 * 获取中文名
 */
function getChineseName(info: MediaClassifyInfo): string {
  return info.title || info.name || "未知";
}

/**
 * 获取英文名（原始名称）
 */
function getEnglishName(info: MediaClassifyInfo): string {
  return info.original_title || info.original_name || "";
}

/**
 * 构建目标文件名
 * 格式：中文名-英文名 (年份) - 分辨率 - 音频 - 来源 - 视频编码
 * 示例：爱丽丝和特蕾丝的梦幻工厂-Alice To Therese... (2023) - 1080p - AAC - WebRip - HEVC 10bit
 */
export function buildTargetFileName(
  info: MediaClassifyInfo,
  techInfo?: MediaTechInfo,
): string {
  return buildTargetFileNameWithEpisode(info, undefined, techInfo);
}

/**
 * 构建带集数的目标文件名
 * 格式：中文名-英文名 (年份) - E01 - 分辨率 - 音频 - 来源 - 视频编码
 */
export function buildTargetFileNameWithEpisode(
  info: MediaClassifyInfo,
  episodeTag?: string,
  techInfo?: MediaTechInfo,
): string {
  const parts: string[] = [];

  const cnName = getChineseName(info);
  const enName = getEnglishName(info);
  const year = getYear(info);

  // 第一部分：中文名
  if (cnName) parts.push(cnName);

  // 第二部分：英文名 (年份)
  if (enName && enName !== cnName) {
    const enPart = year ? `${enName} (${year})` : enName;
    parts.push(enPart);
  } else if (year) {
    parts[0] = `${cnName} (${year})`;
  }

  // 集数标签
  if (episodeTag) parts.push(episodeTag);

  // 技术参数部分：用 " - " 分隔
  const techParts: string[] = [];
  if (techInfo?.screen_size) techParts.push(techInfo.screen_size);
  if (techInfo?.audio_codec) techParts.push(techInfo.audio_codec);
  if (techInfo?.source) techParts.push(techInfo.source);
  if (techInfo?.video_codec) {
    const codecStr = techInfo.color_depth
      ? `${techInfo.video_codec} ${techInfo.color_depth}`
      : techInfo.video_codec;
    techParts.push(codecStr);
  } else if (techInfo?.color_depth) {
    techParts.push(techInfo.color_depth);
  }

  // 组合所有部分
  const result = parts.join("-");
  if (techParts.length > 0) {
    return `${result} - ${techParts.join(" - ")}`;
  }
  return result;
}

/**
 * 计算硬链接目标目录
 * 电影: {base}/{分类}/{中文名} ({年份})/{文件名}
 * 电视剧: {base}/电视剧/{子分类}/{中文名} ({年份})/Season {N}/{文件名}
 * 动漫: {base}/动漫/{中文名} ({年份})/Season {N}/{文件名}
 */
export function computeTargetPath(
  mediaType: "movie" | "tv",
  info: MediaClassifyInfo,
  baseDir: string,
  seasonNumber?: number,
  techInfo?: MediaTechInfo,
): { category: MediaCategory | TvSubCategory; targetDir: string; fileName: string } {
  const category = classifyMedia(mediaType, info);
  const cnName = getChineseName(info);
  const year = getYear(info);
  const targetFileName = buildTargetFileName(info, techInfo);

  // 构建目录名：中文名 (年份)
  const dirName = year ? `${cnName} (${year})` : cnName;

  let targetDir: string;

  if (mediaType === "tv") {
    const seasonStr =
      seasonNumber != null
        ? `Season ${String(seasonNumber).padStart(2, "0")}`
        : "";
    // 动漫单独处理，电视剧需要加父目录
    if (category === "动漫") {
      targetDir = `${baseDir}/动漫/${dirName}${seasonStr ? "/" + seasonStr : ""}`;
    } else {
      targetDir = `${baseDir}/电视剧/${category}/${dirName}${seasonStr ? "/" + seasonStr : ""}`;
    }
  } else {
    targetDir = `${baseDir}/${category}/${dirName}`;
  }

  return { category, targetDir, fileName: targetFileName };
}
