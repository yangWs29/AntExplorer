"use server";

import { readdir, stat, rename, copyFile, rm } from "fs/promises";
import { join, basename, extname } from "path";
import { FileItem } from "@/app/store/explorer-modal-store";
import Seven from "node-7z";
import sevenBin from "7zip-bin-full";
import { isArchiveFile as checkArchiveFile } from "@/app/utils/file-utils";

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
): Promise<{ success: boolean; archivePath: string }> {
  try {
    const fileName = basename(sourcePath);
    const dirPath = join(sourcePath, "..");
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

// 检查文件是否是压缩包
export async function isArchiveFile(fileName: string): Promise<boolean> {
  return checkArchiveFile(fileName);
}
