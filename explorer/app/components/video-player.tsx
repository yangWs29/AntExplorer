"use client";

import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

// 根据文件扩展名获取 MIME 类型
const getVideoType = (src: string): string => {
  const ext = src.split(".").pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
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
  return typeMap[ext || ""] || "video/mp4";
};

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);

  useEffect(() => {
    if (!videoRef.current) return;

    // 等待下一帧，确保 DOM 已经挂载到文档中
    const timer = setTimeout(() => {
      if (!videoRef.current) return;

      console.log("Initializing Video.js with src:", src);

      playerRef.current = videojs(videoRef.current, {
        controls: true,
        responsive: true,
        fluid: true,
        autoplay: false,
        sources: [
          {
            src: src,
            type: getVideoType(src),
          },
        ],
        poster: poster,
      });

      // 监听所有可能的事件
      playerRef.current.on("error", () => {
        const error = playerRef.current.error();
        console.error("Video.js error:", error);
      });

      playerRef.current.on("loadstart", () => {
        console.log("Video loadstart");
      });

      playerRef.current.on("loadedmetadata", () => {
        console.log("Video loadedmetadata");
      });

      playerRef.current.on("loadeddata", () => {
        console.log("Video loaded successfully");
      });

      playerRef.current.on("canplay", () => {
        console.log("Video can play");
      });

      playerRef.current.on("playing", () => {
        console.log("Video is playing");
      });

      playerRef.current.on("play", () => {
        console.log("Video play event triggered");
      });

      playerRef.current.on("pause", () => {
        console.log("Video paused");
      });

      playerRef.current.on("waiting", () => {
        console.log("Video waiting (buffering)");
      });

      // 使用 player.ready() 确保所有组件都已加载
      playerRef.current.ready(() => {
        console.log("Player ready, setting up progress bar preview");

        // 进度条预览功能
        const progressBar = playerRef.current.controlBar.progressControl;
        if (progressBar) {
          console.log("Progress bar found");
          const seekBar = progressBar.seekBar;
          if (seekBar) {
            console.log("Seek bar found, setting up mouse events");
            let previewTimer: NodeJS.Timeout;

            // 监听 seekBar 的鼠标移动
            seekBar.on("mousemove", (event: any) => {
              console.log("Mouse move on seek bar");
              clearTimeout(previewTimer);

              previewTimer = setTimeout(() => {
                const rect = seekBar.el().getBoundingClientRect();
                const percentage = Math.max(
                  0,
                  Math.min(1, (event.pageX - rect.left) / rect.width),
                );
                const time = percentage * playerRef.current.duration();

                console.log("Preview time:", time, "percentage:", percentage);

                setPreviewVisible(true);
                setPreviewPosition(percentage * 100);
                setPreviewTime(time);

                // 使用隐藏的视频元素生成预览帧
                generatePreviewFrame(time);
              }, 50);
            });

            seekBar.on("mouseleave", () => {
              console.log("Mouse left seek bar");
              clearTimeout(previewTimer);
              setPreviewVisible(false);
            });
          } else {
            console.log("Seek bar not found in progress bar");
          }
        } else {
          console.log("Progress bar not found in controlBar");
        }
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      if (playerRef.current) {
        console.log("Disposing Video.js player");
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, poster]);

  // 生成预览帧
  const generatePreviewFrame = (time: number) => {
    if (!hiddenVideoRef.current || !previewCanvasRef.current) {
      console.log("Hidden video or canvas not ready");
      return;
    }

    const hiddenVideo = hiddenVideoRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("Canvas context not available");
      return;
    }

    console.log("Generating preview frame for time:", time);

    // 设置隐藏视频的时间
    hiddenVideo.currentTime = time;

    // 当视频跳转完成后捕获帧
    const onSeeked = () => {
      console.log("Video seeked, drawing frame");
      canvas.width = 160;
      canvas.height = 90;
      ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
      hiddenVideo.removeEventListener("seeked", onSeeked);
    };

    hiddenVideo.addEventListener("seeked", onSeeked);
  };

  return (
    <div style={{ position: "relative" }}>
      <video
        ref={videoRef}
        className="video-js vjs-theme-fantasy"
        controls
        preload="auto"
      />

      {/* 隐藏的视频元素，用于生成预览帧 */}
      <video
        ref={hiddenVideoRef}
        src={src}
        style={{ display: "none" }}
        preload="auto"
        muted
      />

      {/* 预览弹窗 */}
      {previewVisible && (
        <div
          ref={previewRef}
          style={{
            position: "absolute",
            bottom: "60px",
            left: `${previewPosition}%`,
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            borderRadius: "4px",
            padding: "4px",
            pointerEvents: "none",
            zIndex: 1000,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <canvas
            ref={previewCanvasRef}
            style={{
              width: "160px",
              height: "90px",
              borderRadius: "2px",
              display: "block",
            }}
          />
          <div
            style={{
              color: "white",
              fontSize: "12px",
              textAlign: "center",
              marginTop: "4px",
              fontFamily: "monospace",
              fontWeight: "bold",
            }}
          >
            {formatTime(previewTime)}
          </div>
        </div>
      )}
    </div>
  );
}

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
