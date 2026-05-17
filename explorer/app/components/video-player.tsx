"use client";

import { createPlayer } from "@videojs/react";
import { VideoSkin, Video, videoFeatures } from "@videojs/react/video";
import "@videojs/react/video/skin.css";

const Player = createPlayer({ features: videoFeatures });

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <Player.Provider>
      <VideoSkin poster={poster}>
        <Video 
          src={src} 
          playsInline
          style={{ maxWidth: "100%", maxHeight: "80vh" }}
        />
      </VideoSkin>
    </Player.Provider>
  );
}
