import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get("path");

  if (!filePath) {
    return new NextResponse("Missing file path", { status: 400 });
  }

  try {
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;
    const fileBuffer = await readFile(filePath);
    
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

    const contentType = mimeTypes[extension || ""] || "application/octet-stream";

    // 检查是否支持 Range 请求（视频需要）
    const range = request.headers.get("range");
    
    if (range && contentType.startsWith("video/")) {
      // 解析 Range 头
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      
      // 返回部分内容
      return new NextResponse(fileBuffer.slice(start, end + 1), {
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

    // 普通请求
    return new NextResponse(fileBuffer, {
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
