"use server";

import { readdir, stat } from "fs/promises";
import { join } from "path";
import { FileItem } from "@/app/store/file-store";

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
