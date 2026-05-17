"use client";

import React, { useState, useRef, useEffect } from "react";
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

const DraggableModal = ({ modal }: DraggableModalProps) => {
  const {
    closeModal,
    updatePosition,
    bringToFront,
    goBack,
    canGoBack,
    navigateToPath,
    setModalLoading,
    setModalFileList,
  } = useModalStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current) return;

    setIsDragging(true);
    bringToFront(modal.id);

    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      updatePosition(modal.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, modal.id, updatePosition]);

  // 生成面包屑路径
  const breadcrumbItems = modal.history
    .slice(0, modal.historyIndex + 1)
    .map((path, index) => {
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

              // 获取该路径对应的文件夹名称
              const targetFolderName = path.split("/").pop() || path;

              // 更新模态框状态：设置路径和历史索引
              setModalLoading(modal.id, true);
              setModalFileList(modal.id, []);

              // 更新 modals 数组中的对应项
              useModalStore.setState((state) => ({
                modals: state.modals.map((m) => {
                  if (m.id !== modal.id) return m;
                  return {
                    ...m,
                    path: path,
                    title: targetFolderName,
                    historyIndex: index,
                    fileList: [],
                    loading: true,
                  };
                }),
              }));
            }}
          >
            {folderName}
          </span>
        ),
        key: path,
      };
    });

  const style: React.CSSProperties = {
    position: "fixed",
    left: modal.position.x,
    top: modal.position.y,
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
};

export default DraggableModal;
