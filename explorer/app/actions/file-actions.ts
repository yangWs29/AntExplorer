"use server";

import { readdir, stat, rename, copyFile, rm } from "fs/promises";
import { join, basename } from "path";
import { FileItem } from "@/app/store/explorer-modal-store";

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
