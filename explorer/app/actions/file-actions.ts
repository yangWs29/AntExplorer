"use server";

import { readdir, stat, rename, copyFile, rm, link, mkdir } from "fs/promises";
import { join, basename, extname } from "path";
import { FileItem } from "@/app/store/explorer-modal-store";
import Seven from "node-7z";
import sevenBin from "7zip-bin-full";

// 获取项目根目录（Next.js 会自动设置 PROJECT_CWD）
const projectRoot = process.cwd();

// 构建正确的 7zip 二进制文件路径
// 将 /ROOT/... 替换为实际的项目路径
const binPath = sevenBin.path7z.replace("/ROOT", projectRoot);

// 递归计算文件夹大小
async function calculateDirSize(dirPath: string): Promise<number> {
  let totalSize = 0;
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // 递归计算子文件夹大小
      totalSize += await calculateDirSize(fullPath);
    } else {
      // 获取文件大小
      const stats = await stat(fullPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

export async function getFolderSize(folderPath: string): Promise<number> {
  try {
    const stats = await stat(folderPath);
    if (!stats.isDirectory()) {
      throw new Error("Path is not a directory");
    }
    return await calculateDirSize(folderPath);
  } catch (error) {
    console.error("Error calculating folder size:", error);
    throw error;
  }
}

// 获取文件的硬链接信息
export async function getFileHardLinks(filePath: string): Promise<{
  linkCount: number;
  inode: number;
}> {
  try {
    const stats = await stat(filePath);
    return {
      linkCount: stats.nlink,
      inode: stats.ino,
    };
  } catch (error) {
    console.error("Error getting file hard links:", error);
    throw error;
  }
}

// 查找具有相同 inode 的所有硬链接路径
export async function findHardLinks(
  filePath: string,
  searchDir?: string,
): Promise<string[]> {
  try {
    const targetStats = await stat(filePath);
    const targetInode = targetStats.ino;
    const targetDev = targetStats.dev;

    // 如果没有指定搜索目录，使用文件所在目录
    const searchPath =
      searchDir || filePath.substring(0, filePath.lastIndexOf("/"));

    const hardLinks: string[] = [];

    // 递归搜索目录
    async function searchDirectory(dirPath: string) {
      try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);

          try {
            const entryStats = await stat(fullPath);

            // 检查是否是同一个设备的同一个 inode
            if (
              entryStats.ino === targetInode &&
              entryStats.dev === targetDev
            ) {
              hardLinks.push(fullPath);
            }

            // 如果是目录且不是符号链接，递归搜索
            if (entry.isDirectory() && !entry.isSymbolicLink()) {
              await searchDirectory(fullPath);
            }
          } catch (err) {
            // 忽略无法访问的文件
            continue;
          }
        }
      } catch (err) {
        // 忽略无法访问的目录
      }
    }

    await searchDirectory(searchPath);
    return hardLinks;
  } catch (error) {
    console.error("Error finding hard links:", error);
    throw error;
  }
}

export async function readDirectory(dirPath?: string): Promise<FileItem[]> {
  try {
    const targetPath = dirPath || process.env.NEXT_PUBLIC_DIR;

    if (!targetPath) {
      throw new Error("Directory path not configured");
    }

    const files = await readdir(targetPath);

    const fileItems: FileItem[] = [];

    for (const file of files) {
      const fullPath = join(targetPath, file);
      const stats = await stat(fullPath);

      fileItems.push({
        name: file,
        path: fullPath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modifiedTime: stats.mtime,
      });
    }

    // 排序：文件夹在前，文件在后
    fileItems.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return fileItems;
  } catch (error) {
    console.error("Error reading directory:", error);
    throw error;
  }
}

export async function moveFile(sourcePath: string, targetDir: string) {
  try {
    const fileName = basename(sourcePath);
    const targetPath = join(targetDir, fileName);

    await rename(sourcePath, targetPath);

    return { success: true, targetPath };
  } catch (error) {
    console.error("Error moving file:", error);
    throw error;
  }
}

export async function moveFiles(
  sourcePaths: string[],
  targetDir: string,
): Promise<void> {
  for (const sourcePath of sourcePaths) {
    await moveFile(sourcePath, targetDir);
  }
}

export async function copyFiles(
  sourcePaths: string[],
  targetDir: string,
): Promise<void> {
  for (const sourcePath of sourcePaths) {
    const fileName = basename(sourcePath);
    const targetPath = join(targetDir, fileName);
    await copyFile(sourcePath, targetPath);
  }
}

export async function deleteFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    await rm(filePath, { recursive: true, force: true });
  }
}

export async function pasteFiles(
  sourcePaths: string[],
  targetDir: string,
): Promise<void> {
  await copyFiles(sourcePaths, targetDir);
}

// 压缩文件或文件夹
export async function compressFile(
  sourcePath: string,
  archiveName?: string,
  targetDir?: string,
): Promise<{ success: boolean; archivePath: string }> {
  try {
    const fileName = basename(sourcePath);
    const dirPath = targetDir || join(sourcePath, "..");
    const archiveFileName = archiveName || `${fileName}.7z`;
    const archivePath = join(dirPath, archiveFileName);

    return new Promise((resolve, reject) => {
      const seven = Seven.add(archivePath, sourcePath, {
        $bin: binPath,
      });

      seven.on("end", () => {
        resolve({ success: true, archivePath });
      });

      seven.on("error", (err) => {
        console.error("Compression error:", err);
        reject(err);
      });
    });
  } catch (error) {
    console.error("Error compressing file:", error);
    throw error;
  }
}

// 解压缩文件
export async function extractArchive(
  archivePath: string,
  targetDir?: string,
): Promise<{ success: boolean; extractPath: string }> {
  try {
    const dirPath = targetDir || join(archivePath, "..");
    const archiveName = basename(archivePath, extname(archivePath));
    const extractPath = join(dirPath, archiveName);

    return new Promise((resolve, reject) => {
      const seven = Seven.extractFull(archivePath, extractPath, {
        $bin: binPath,
      });

      seven.on("end", () => {
        resolve({ success: true, extractPath });
      });

      seven.on("error", (err) => {
        console.error("Extraction error:", err);
        reject(err);
      });
    });
  } catch (error) {
    console.error("Error extracting archive:", error);
    throw error;
  }
}

// 获取目录树结构（初始加载第一层）
export async function getDirectoryTree(
  dirPath: string,
): Promise<{ path: string; name: string }[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childPath = join(dirPath, entry.name);
        result.push({
          path: childPath,
          name: entry.name,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error reading directory tree:", error);
    return [];
  }
}

// 获取子目录（懒加载）
export async function getSubDirectories(
  dirPath: string,
): Promise<{ path: string; name: string }[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childPath = join(dirPath, entry.name);
        result.push({
          path: childPath,
          name: entry.name,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error reading subdirectories:", error);
    return [];
  }
}

// 媒体库硬链接基础路径
const MEDIA_LIBRARY_DIR = process.env.MEDIA_LIBRARY_DIR || "/media";

// 媒体库硬链接整理
export async function hardLinkToLibraryAction(
  sourcePath: string,
  targetDir: string,
  newFileName: string,
): Promise<{ success: boolean; targetPath: string }> {
  try {
    // 确保目标目录存在
    await mkdir(targetDir, { recursive: true });

    const targetPath = join(targetDir, newFileName);

    // 创建硬链接
    await link(sourcePath, targetPath);

    return { success: true, targetPath };
  } catch (error) {
    console.error("硬链接创建失败:", error);
    throw error;
  }
}

// 获取媒体库基础路径
export async function getMediaLibraryBaseDirAction(): Promise<string> {
  return MEDIA_LIBRARY_DIR;
}

// 视频文件扩展名
const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".ts", ".rmvb", ".rm",
]);

// 扫描目录下的所有视频文件（递归）
export async function scanDirectoryMediaAction(
  dirPath: string,
): Promise<{ name: string; path: string }[]> {
  try {
    const results: { name: string; path: string }[] = [];

    async function scan(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else {
          const ext = extname(entry.name).toLowerCase();
          if (VIDEO_EXTENSIONS.has(ext)) {
            results.push({ name: entry.name, path: fullPath });
          }
        }
      }
    }

    await scan(dirPath);
    // 按文件名排序
    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  } catch (error) {
    console.error("扫描目录失败:", error);
    throw error;
  }
}

// 重命名文件
export async function renameFileAction(
  filePath: string,
  newName: string,
): Promise<{ success: boolean; newPath: string }> {
  try {
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    const newPath = join(dir, newName);
    await rename(filePath, newPath);
    return { success: true, newPath };
  } catch (error) {
    console.error("重命名失败:", error);
    throw error;
  }
}

// 批量硬链接
export async function batchHardLinkAction(
  files: { sourcePath: string; targetDir: string; newFileName: string }[],
): Promise<{ success: boolean; results: { source: string; target: string; success: boolean; error?: string }[] }> {
  const results: { source: string; target: string; success: boolean; error?: string }[] = [];

  for (const file of files) {
    try {
      await mkdir(file.targetDir, { recursive: true });
      const targetPath = join(file.targetDir, file.newFileName);
      await link(file.sourcePath, targetPath);
      results.push({ source: file.sourcePath, target: targetPath, success: true });
    } catch (error) {
      results.push({
        source: file.sourcePath,
        target: "",
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      });
    }
  }

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}
