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

interface DraggableModalProps {
  modal: ModalInstance;
}

type WindowSize = "default" | "fullscreen" | "half-width";

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
      },
    },
    {
      key: "half-width",
      icon: <ColumnWidthOutlined />,
      label: "高度 100%，宽度 50%",
      onClick: () => {
        setWindowSize("half-width");
        setPosition({ x: Math.round(window.innerWidth / 4), y: 0 });
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
      },
    },
  ];

  const defaultWidth =
    (
      {
        "file-detail": "500px",
        compress: "500px",
        extract: "500px",
        analyze: "560px",
        "batch-analyze": "560px",
        "media-management": "900px",
        system: "520px",
      } as Record<string, string>
    )[modal.type] ?? "600px";

  const style: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: modal.zIndex,
    width:
      windowSize === "fullscreen"
        ? "100vw"
        : windowSize === "half-width"
          ? "50vw"
          : defaultWidth,
    height:
      windowSize === "fullscreen" || windowSize === "half-width"
        ? "100vh"
        : undefined,
    maxHeight:
      windowSize === "fullscreen" || windowSize === "half-width"
        ? undefined
        : "70vh",
    margin: 0,
  };

  const bodyMaxHeight =
    windowSize === "fullscreen" || windowSize === "half-width"
      ? "calc(100vh - 140px)"
      : "calc(70vh - 140px)";

  return (
    <Card
      ref={modalRef}
      className="overflow-hidden"
      style={style}
      onMouseDown={() => bringToFront(modal.id)}
      styles={{
        body: {
          padding: 0,
          maxHeight: bodyMaxHeight,
          overflow: "auto",
        },
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
      ) : null}
    </Card>
  );
});

export default DraggableModal;
