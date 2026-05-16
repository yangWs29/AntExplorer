"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Image } from "antd";

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "tiff",
  "tif",
  "avif",
];

export const isImageFile = (name: string) =>
  IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

interface ImagePreviewContextType {
  items: Array<{ src: string }>;
  preview: Parameters<typeof Image.PreviewGroup>[0]["preview"] | false;
  openPreview: (items: string[], current: number) => void;
  closePreview: () => void;
}

const ImagePreviewContext = createContext<ImagePreviewContextType | null>(null);

export const useGlobalImagePreview = () => {
  const context = useContext(ImagePreviewContext);
  if (!context) {
    throw new Error(
      "useGlobalImagePreview must be used within ImagePreviewProvider",
    );
  }
  return context;
};

export const ImagePreviewProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [items, setItems] = useState<Array<{ src: string }>>([]);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);

  const openPreview = useCallback((newItems: string[], index: number) => {
    const formattedItems = newItems.map((src) => ({ src }));
    setItems(formattedItems);
    setCurrent(index);
    setVisible(true);
  }, []);

  const closePreview = useCallback(() => {
    setVisible(false);
    setItems([]);
  }, []);

  const preview = visible
    ? {
        open: visible,
        current,
        onChange: (current: number) => {
          setCurrent(current);
        },
        onOpenChange: (val: boolean) => {
          if (!val) {
            closePreview();
          }
        },
      }
    : false;

  return (
    <ImagePreviewContext.Provider
      value={{ items, preview, openPreview, closePreview }}
    >
      {children}
      {items.length > 0 && (
        <div style={{ display: "none" }}>
          <Image.PreviewGroup items={items} preview={preview}>
            {items.map((item, index) => (
              <Image key={index} src={item.src} />
            ))}
          </Image.PreviewGroup>
        </div>
      )}
    </ImagePreviewContext.Provider>
  );
};
