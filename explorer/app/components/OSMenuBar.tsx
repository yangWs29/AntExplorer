"use client";

import React, { useState, useEffect } from "react";
import { useModalStore } from "@/app/store/explorer-modal-store";

const OSMenuBar = () => {
  const [time, setTime] = useState("");
  const modals = useModalStore((s) => s.modals);

  // 当前最顶层（聚焦）的窗口
  const focusedModal =
    modals.length > 0
      ? modals.reduce((prev, curr) => (curr.zIndex > prev.zIndex ? curr : prev))
      : null;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const opts: Intl.DateTimeFormatOptions = {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      setTime(now.toLocaleDateString("zh-CN", opts));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex-shrink-0 h-7 flex items-center justify-between px-4 select-none"
      style={{
        background: "rgba(30, 30, 30, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* 左侧 */}
      <div className="flex items-center gap-4 text-white/90 text-xs">
        <span className="font-semibold tracking-wide"></span>
        {focusedModal && (
          <>
            <span className="text-white/30">–</span>
            <span className="text-white/70 truncate max-w-48">
              {focusedModal.title}
            </span>
          </>
        )}
      </div>

      {/* 右侧 */}
      <div className="flex items-center gap-3 text-white/70 text-xs">
        <span className="tabular-nums">{time}</span>
      </div>
    </div>
  );
};

export default OSMenuBar;
