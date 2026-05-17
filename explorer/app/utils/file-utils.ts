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
