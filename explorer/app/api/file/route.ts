import { NextRequest, NextResponse } from "next/server";
import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get("path");

  if (!filePath) {
    return new NextResponse("Missing file path", { status: 400 });
  }

  try {
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;

    // 根据文件扩展名设置 MIME 类型
    const extension = filePath.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      ico: "image/x-icon",
      bmp: "image/bmp",
      // 视频格式
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      flv: "video/x-flv",
      wmv: "video/x-ms-wmv",
      m4v: "video/x-m4v",
    };

    const contentType =
      mimeTypes[extension || ""] || "application/octet-stream";

    // 检查是否支持 Range 请求（视频需要）
    const range = request.headers.get("range");

    if (range && contentType.startsWith("video/")) {
      // 解析 Range 头，支持三种格式：
      // 1. bytes=start-end  (指定范围)
      // 2. bytes=start-     (从 start 到末尾)
      // 3. bytes=-suffix    (最后 suffix 字节)
      const rangeValue = range.replace(/bytes=/, "");
      const parts = rangeValue.split("-");
      const startPart = parts[0];
      const endPart = parts[1];

      let start: number;
      let end: number;

      if (!startPart && endPart) {
        // 后缀范围：bytes=-500 表示最后 500 字节
        const suffixLength = parseInt(endPart, 10);
        start = Math.max(0, fileSize - suffixLength);
        end = fileSize - 1;
      } else if (startPart && !endPart) {
        // 开放范围：bytes=100- 表示从 100 到末尾
        start = parseInt(startPart, 10);
        end = fileSize - 1;
      } else if (startPart && endPart) {
        // 完整范围：bytes=100-200
        start = parseInt(startPart, 10);
        end = parseInt(endPart, 10);
      } else {
        // 无效 Range，返回完整文件
        start = 0;
        end = fileSize - 1;
      }

      // 边界校验
      if (isNaN(start) || isNaN(end) || start < 0 || end < 0 || start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      // 确保 end 不超过文件大小
      end = Math.min(end, fileSize - 1);
      const chunksize = end - start + 1;

      // 使用 createReadStream 流式读取指定范围，避免将整个文件加载到内存
      const nodeStream = createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    // 普通请求：也使用流式读取，避免大文件内存溢出
    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": fileSize.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return new NextResponse("File not found", { status: 404 });
  }
}
