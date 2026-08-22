"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  CloseOutlined,
  ArrowLeftOutlined,
  ExpandOutlined,
  ColumnWidthOutlined,
  MinusSquareOutlined,
} from "@ant-design/icons";
import { Card, Button, Breadcrumb, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  useModalStore,
  type ModalInstance,
} from "@/app/store/explorer-modal-store";
import FileList from "./FileList";
import ViewModeToggle from "./ViewModeToggle";
import FileDetailContent from "./FileDetailContent";
import CompressContent from "./CompressContent";
import ExtractContent from "./ExtractContent";
import AnalyzeContent from "./AnalyzeContent";
import BatchAnalyzeContent from "./BatchAnalyzeContent";
import MediaManagementContent from "./MediaManagementContent";
import SystemContent from "./SystemContent";
import FinderContent from "./FinderContent";

interface DraggableModalProps {
  modal: ModalInstance;
}

type WindowSize = "default" | "fullscreen" | "half-width";
type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null;

const DraggableModal = memo(({ modal }: DraggableModalProps) => {
  const { closeModal, bringToFront, goBack, canGoBack } = useModalStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState<WindowSize>("default");
  const [defaultPosition] = useState(() => {
    const state = useModalStore.getState();
    const index = state.modals.findIndex((m) => m.id === modal.id);
    const offset = Math.min(index * 30, 200);
    return { x: 100 + offset, y: 100 + offset };
  });
  // 使用本地状态管理位置，根据窗口索引计算初始位置
  const [position, setPosition] = useState(() => {
    const state = useModalStore.getState();
    const index = state.modals.findIndex((m) => m.id === modal.id);
    // 每个窗口偏移 30px，最大偏移不超过 200px
    const offset = Math.min(index * 30, 200);
    return { x: 100 + offset, y: 100 + offset };
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const [resizeDir, setResizeDir] = useState<ResizeDir>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!modalRef.current) return;

      setIsDragging(true);
      bringToFront(modal.id);

      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [modal.id, bringToFront],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // 只更新本地状态
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove, {
        passive: true,
      });
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // ── 边缘拖拽调整大小 ──
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, dir: ResizeDir) => {
      e.preventDefault();
      e.stopPropagation();
      if (!modalRef.current) return;
      const rect = modalRef.current.getBoundingClientRect();
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: rect.width,
        h: rect.height,
        px: position.x,
        py: position.y,
      };
      setResizeDir(dir);
      setWindowSize("default");
      bringToFront(modal.id);
    },
    [position.x, position.y, modal.id, bringToFront],
  );

  useEffect(() => {
    if (!resizeDir) return;
    const handleMouseMove = (e: MouseEvent) => {
      const s = resizeStart.current;
      let dx = e.clientX - s.x;
      let dy = e.clientY - s.y;
      let newW = s.w;
      let newH = s.h;
      let newX = s.px;
      let newY = s.py;

      if (resizeDir.includes("e")) newW = Math.max(400, s.w + dx);
      if (resizeDir.includes("w")) {
        newW = Math.max(400, s.w - dx);
        newX = s.px + (s.w - newW);
      }
      if (resizeDir.includes("s")) newH = Math.max(300, s.h + dy);
      if (resizeDir.includes("n")) {
        newH = Math.max(300, s.h - dy);
        newY = s.py + (s.h - newH);
      }

      setPosition({ x: newX, y: newY });
      modalRef.current!.style.width = newW + "px";
      modalRef.current!.style.height = newH + "px";
    };
    const handleMouseUp = () => {
      setResizeDir(null);
      // 保存自定义尺寸，以便恢复默认时保持调整后的尺寸
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        setCustomSize({ w: rect.width, h: rect.height });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeDir]);

  // 生成面包屑路径（使用 useMemo 缓存）
  const breadcrumbItems = React.useMemo(() => {
    return modal.history.slice(0, modal.historyIndex + 1).map((path, index) => {
      const folderName = path.split("/").pop() || path;
      const isCurrentPath = index === modal.historyIndex;

      return {
        title: isCurrentPath ? (
          <span className="text-gray-500">{folderName}</span>
        ) : (
          <span
            className="cursor-pointer hover:text-blue-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goBackToPath(modal.id, path, index);
            }}
          >
            {folderName}
          </span>
        ),
        key: path,
      };
    });
  }, [modal.history, modal.historyIndex, modal.id]);

  // 优化的面包屑导航函数
  const goBackToPath = useCallback(
    (modalId: string, path: string, index: number) => {
      const targetFolderName = path.split("/").pop() || path;

      useModalStore.setState((state) => ({
        modals: state.modals.map((m) => {
          if (m.id !== modalId) return m;
          return {
            ...m,
            path: path,
            title: targetFolderName,
            historyIndex: index,
          };
        }),
      }));
    },
    [],
  );

  // 窗口大小切换菜单
  const windowSizeMenu: MenuProps["items"] = [
    {
      key: "fullscreen",
      icon: <ExpandOutlined />,
      label: "全屏",
      onClick: () => {
        setWindowSize("fullscreen");
        setPosition({ x: 0, y: 0 });
        setCustomSize(null);
      },
    },
    {
      key: "half-width",
      icon: <ColumnWidthOutlined />,
      label: "高度 100%，宽度 50%",
      onClick: () => {
        setWindowSize("half-width");
        setPosition({ x: Math.round(window.innerWidth / 4), y: 0 });
        setCustomSize(null);
      },
    },
    { type: "divider" },
    {
      key: "default",
      icon: <MinusSquareOutlined />,
      label: "恢复默认",
      onClick: () => {
        setWindowSize("default");
        setPosition(defaultPosition);
        setCustomSize(null);
      },
    },
  ];

  const defaultWidthNum =
    (
      {
        "file-detail": 500,
        compress: 500,
        extract: 500,
        analyze: 560,
        "batch-analyze": 560,
        "media-management": 900,
        system: 520,
        finder: 960,
      } as Record<string, number>
    )[modal.type] ?? 600;

  const [customSize, setCustomSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  const isFinder = modal.type === "finder";

  const computedDims = (() => {
    if (windowSize === "fullscreen")
      return { w: window.innerWidth, h: window.innerHeight };
    if (windowSize === "half-width")
      return { w: window.innerWidth * 0.5, h: window.innerHeight };
    if (customSize) return customSize;
    return {
      w: defaultWidthNum,
      h: isFinder ? window.innerHeight * 0.85 : undefined,
    };
  })();

  const style: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: modal.zIndex,
    width: computedDims.w,
    height: computedDims.h,
    minHeight: isFinder ? 300 : undefined,
    margin: 0,
  };

  const bodyMaxHeight =
    windowSize === "fullscreen" || windowSize === "half-width"
      ? "calc(100vh - 90px)"
      : isFinder
        ? "calc(100% - 40px)"
        : "calc(70vh - 90px)";

  // 其他类型没有固定 Card height，保留 maxHeight 约束
  const bodyStyle: React.CSSProperties = {
    padding: 0,
    height: bodyMaxHeight,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
    ...(isDragging
      ? { pointerEvents: "none" as const, userSelect: "none" as const }
      : {}),
  };

  return (
    <Card
      ref={modalRef}
      className="overflow-hidden"
      style={style}
      onMouseDown={() => bringToFront(modal.id)}
      styles={{
        body: bodyStyle,
        header: {
          cursor: "move",
          userSelect: "none",
        },
        actions: {
          padding: "0px 16px",
        },
      }}
      title={
        <div
          className="cursor-move select-none flex items-center justify-between"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 cursor-default">
            {modal.type === "explorer" ? (
              <>
                {canGoBack(modal.id) && (
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowLeftOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      goBack(modal.id);
                    }}
                  />
                )}
                <Breadcrumb items={breadcrumbItems} className="flex-1" />
              </>
            ) : (
              <span className="flex-1 truncate">{modal.title}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Dropdown
              menu={{ items: windowSizeMenu }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                icon={
                  windowSize === "fullscreen" ? (
                    <ExpandOutlined />
                  ) : windowSize === "half-width" ? (
                    <ColumnWidthOutlined />
                  ) : (
                    <MinusSquareOutlined />
                  )
                }
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                closeModal(modal.id);
              }}
            />
          </div>
        </div>
      }
      actions={
        modal.type === "explorer"
          ? [<ViewModeToggle key="view-mode" modalId={modal.id} />]
          : undefined
      }
    >
      {modal.type === "explorer" ? (
        <FileList modalId={modal.id} initialPath={modal.path} />
      ) : modal.type === "file-detail" ? (
        modal.fileDetail && (
          <FileDetailContent modalId={modal.id} fileDetail={modal.fileDetail} />
        )
      ) : modal.type === "compress" ? (
        <CompressContent modalId={modal.id} />
      ) : modal.type === "extract" ? (
        <ExtractContent modalId={modal.id} />
      ) : modal.type === "analyze" ? (
        <AnalyzeContent modalId={modal.id} />
      ) : modal.type === "batch-analyze" ? (
        <BatchAnalyzeContent modalId={modal.id} />
      ) : modal.type === "media-management" ? (
        <MediaManagementContent modalId={modal.id} />
      ) : modal.type === "system" ? (
        <SystemContent modalId={modal.id} />
      ) : modal.type === "finder" ? (
        <FinderContent modalId={modal.id} />
      ) : null}

      {/* 边缘拖拽调整大小手柄 */}
      {windowSize === "default" && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              cursor: "n-resize",
              zIndex: 10,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, "n")}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 5,
              cursor: "s-resize",
              zIndex: 10,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, "s")}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: 5,
              cursor: "w-resize",
              zIndex: 10,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, "w")}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 5,
              cursor: "e-resize",
              zIndex: 10,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, "e")}
          />
          <div
            style={{
              position: "absolute",
              top: -3,
              left: -3,
              width: 14,
              height: 14,
              cursor: "nw-resize",
              zIndex: 11,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
          />
          <div
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 14,
              height: 14,
              cursor: "ne-resize",
              zIndex: 11,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
          />
          <div
            style={{
              position: "absolute",
              bottom: -3,
              left: -3,
              width: 14,
              height: 14,
              cursor: "sw-resize",
              zIndex: 11,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
          />
          <div
            style={{
              position: "absolute",
              bottom: -3,
              right: -3,
              width: 14,
              height: 14,
              cursor: "se-resize",
              zIndex: 11,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, "se")}
          />
        </>
      )}
    </Card>
  );
});

export default DraggableModal;
