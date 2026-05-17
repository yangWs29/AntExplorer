"use client";

import { useEffect, useState } from "react";

// 全局缓存，避免重复提取
const thumbnailCache = new Map<string, string>();

/**
 * 提取视频第一帧作为预览图（带缓存和限流）
 */
export function useVideoThumbnail(videoPath: string) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!videoPath) return;

    // 检查缓存
    if (thumbnailCache.has(videoPath)) {
      setThumbnail(thumbnailCache.get(videoPath)!);
      return;
    }

    let cancelled = false;
    let video: HTMLVideoElement | null = null;

    const extractFrame = async () => {
      setLoading(true);
      try {
        // 创建 video 元素
        video = document.createElement("video");
        video.crossOrigin = "anonymous";

        // 浏览器会自动使用 Range 请求获取视频元数据和第一帧
        // API 已支持 Range 请求，只会传输必要的数据（通常 < 1MB）
        video.src = `/api/file?path=${encodeURIComponent(videoPath)}`;
        video.muted = true;

        // 设置 preload 为 metadata，只加载元数据
        video.preload = "metadata";

        // 等待视频元数据加载
        await new Promise((resolve, reject) => {
          video!.onloadedmetadata = resolve;
          video!.onerror = reject;

          // 设置超时
          setTimeout(() => reject(new Error("Timeout")), 5000);
        });

        if (cancelled) return;

        // 跳转到第一帧
        video.currentTime = 0;

        // 等待seek完成
        await new Promise((resolve) => {
          video!.onseeked = resolve;
        });

        if (cancelled) return;

        // 创建 canvas 并绘制视频帧（缩小尺寸以提升性能）
        const canvas = document.createElement("canvas");
        const maxWidth = 400; // 限制最大宽度
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 转换为 base64（降低质量以提升性能）
          const dataUrl = canvas.toDataURL("image/jpeg", 0.5);

          // 存入缓存
          thumbnailCache.set(videoPath, dataUrl);

          if (!cancelled) {
            setThumbnail(dataUrl);
          }
        }

        // 清理
        if (video) {
          video.src = "";
          video.load();
          video = null;
        }
      } catch (error) {
        console.error("Failed to extract video thumbnail:", error);
        if (!cancelled) {
          setThumbnail(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // 使用 requestIdleCallback 或 setTimeout 延迟执行，避免阻塞主线程
    const scheduleExtraction = () => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        const idleCallbackId = (window as any).requestIdleCallback(() => {
          extractFrame();
        });
        return () => {
          cancelled = true;
          (window as any).cancelIdleCallback(idleCallbackId);
          if (video) {
            video.src = "";
            video.load();
          }
        };
      } else {
        const timeoutId = setTimeout(() => {
          extractFrame();
        }, 100); // 延迟 100ms 执行
        return () => {
          cancelled = true;
          clearTimeout(timeoutId);
          if (video) {
            video.src = "";
            video.load();
          }
        };
      }
    };

    return scheduleExtraction();
  }, [videoPath]);

  return { thumbnail, loading };
}
