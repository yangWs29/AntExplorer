"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { CloseOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Card, Button, Breadcrumb } from "antd";
import {
  useModalStore,
  type ModalInstance,
} from "@/app/store/explorer-modal-store";
import FileList from "./file-list";
import ViewModeToggle from "./view-mode-toggle";
import FileDetailContent from "./file-detail-content";
import CompressContent from "./compress-content";
import ExtractContent from "./extract-content";

interface DraggableModalProps {
  modal: ModalInstance;
}

const DraggableModal = memo(({ modal }: DraggableModalProps) => {
  const { closeModal, bringToFront, goBack, canGoBack } = useModalStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // 使用本地状态管理位置，根据窗口索引计算初始位置
  const [position, setPosition] = useState(() => {
    // 获取当前 modal 在列表中的索引
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

  const style: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: modal.zIndex,
    width:
      modal.type === "file-detail" ||
      modal.type === "compress" ||
      modal.type === "extract"
        ? "500px"
        : "600px",
    maxHeight: "70vh",
  };

  return (
    <Card
      ref={modalRef}
      className="overflow-hidden"
      style={style}
      onMouseDown={() => bringToFront(modal.id)}
      styles={{
        body: {
          padding: 0,
          maxHeight: "calc(70vh - 140px)",
        },
        header: {
          cursor: "move",
          userSelect: "none",
          padding: "12px 16px",
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
          </div>
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
      ) : (
        modal.type === "extract" && <ExtractContent modalId={modal.id} />
      )}
    </Card>
  );
});

export default DraggableModal;
