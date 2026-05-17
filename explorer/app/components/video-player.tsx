"use client";

import { useEffect, useRef } from "react";
import { createPlayer } from "@videojs/react";
import { VideoSkin, Video, videoFeatures } from "@videojs/react/video";
import "@videojs/react/video/skin.css";

const Player = createPlayer({ features: videoFeatures });

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 添加键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      const video = videoRef.current;
      
      // 逗号 , - 上一帧（后退 1/30 秒）
      if (e.key === ",") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 1 / 30);
      }
      
      // 句号 . - 下一帧（前进 1/30 秒）
      if (e.key === ".") {
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 1 / 30);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Player.Provider>
      <VideoSkin poster={poster}>
        <Video 
          ref={videoRef}
          src={src} 
          playsInline
          style={{ maxWidth: "100%", maxHeight: "80vh" }}
        />
      </VideoSkin>
    </Player.Provider>
  );
}
