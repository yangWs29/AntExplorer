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
