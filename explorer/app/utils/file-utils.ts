import { guessit } from "guessit-js";

/**
 * 检查文件是否是压缩包
 * @param fileName - 文件名
 * @returns 是否为压缩包
 */
export function isArchiveFile(fileName: string): boolean {
  const archiveExtensions = [
    ".7z",
    ".zip",
    ".rar",
    ".tar",
    ".gz",
    ".bz2",
    ".xz",
    ".tar.gz",
    ".tar.bz2",
  ];
  const lowerName = fileName.toLowerCase();
  return archiveExtensions.some((ext) => lowerName.endsWith(ext));
}

/**
 * 检查文件是否是视频文件
 * @param fileName - 文件名
 * @returns 是否为视频文件
 */
export function isVideoFile(fileName: string): boolean {
  const videoExtensions = [
    ".mp4",
    ".mkv",
    ".avi",
    ".mov",
    ".wmv",
    ".flv",
    ".webm",
    ".m4v",
    ".ts",
    ".rmvb",
    ".rm",
  ];
  const lowerName = fileName.toLowerCase();
  return videoExtensions.some((ext) => lowerName.endsWith(ext));
}

/**
 * 从文件名解析视频信息（标题、年份、季集、媒体技术参数等）
 * 使用 guessit-js 进行解析
 * @param fileName - 文件名（不含扩展名）
 * @returns 解析出的视频信息
 */
export function parseVideoFileName(fileName: string): {
  title: string;
  year?: string;
  season?: string;
  episode?: string;
  // 媒体技术参数
  screen_size?: string;
  audio_codec?: string;
  source?: string;
  video_codec?: string;
  color_depth?: string;
} {
  const result = guessit(fileName);

  const title = result.title || fileName;
  const year = result.year != null ? String(result.year) : undefined;
  const season =
    result.season != null
      ? String(Array.isArray(result.season) ? result.season[0] : result.season)
      : undefined;
  const episode =
    result.episode != null
      ? String(Array.isArray(result.episode) ? result.episode[0] : result.episode)
      : undefined;

  // 媒体技术参数
  const screen_size = result.screen_size as string | undefined;
  const audio_codec = Array.isArray(result.audio_codec)
    ? result.audio_codec[0]
    : (result.audio_codec as string | undefined);
  const source = Array.isArray(result.source)
    ? result.source[0]
    : (result.source as string | undefined);
  const video_codec = Array.isArray(result.video_codec)
    ? result.video_codec[0]
    : (result.video_codec as string | undefined);
  const color_depth = result.color_depth as string | undefined;

  return { title, year, season, episode, screen_size, audio_codec, source, video_codec, color_depth };
}

/**
 * 将完整路径转换为相对路径（隐藏根目录）
 * @param fullPath - 完整路径
 * @param rootDir - 根目录路径
 * @returns 相对路径
 */
export function getDisplayPath(fullPath: string, rootDir: string): string {
  if (!fullPath) return "";
  if (fullPath.startsWith(rootDir)) {
    return "/" + fullPath.substring(rootDir.length).replace(/^\//, "");
  }
  return fullPath;
}

/**
 * 将相对路径转换回完整路径
 * @param displayPath - 相对路径
 * @param rootDir - 根目录路径
 * @returns 完整路径
 */
export function getFullPath(displayPath: string, rootDir: string): string {
  if (!displayPath) return rootDir;
  if (displayPath.startsWith("/")) {
    return rootDir + displayPath;
  }
  return rootDir + "/" + displayPath;
}
