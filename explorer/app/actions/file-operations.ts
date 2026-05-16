"use server";

import { rename } from "fs/promises";
import { join, basename } from "path";

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
  targetDir: string
): Promise<void> {
  for (const sourcePath of sourcePaths) {
    await moveFile(sourcePath, targetDir);
  }
}
