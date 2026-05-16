import { create } from "zustand";

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export type ViewMode = "list" | "icon";

export interface ModalPosition {
  x: number;
  y: number;
}

export interface ModalInstance {
  id: string;
  title: string;
  path: string;
  position: ModalPosition;
  zIndex: number;
  history: string[]; // 导航历史
  historyIndex: number; // 当前历史索引
  fileList: FileItem[]; // 文件列表
  loading: boolean; // 加载状态
  viewMode: ViewMode; // 视图模式
  iconColumns: 1 | 2 | 3 | 4; // 图标模式列数
}

interface ExplorerModalStore {
  modals: ModalInstance[];
  nextZIndex: number;
  copiedFiles: string[]; // 全局复制的文件列表
  openModal: (title: string, path: string) => void;
  closeModal: (id: string) => void;
  updatePosition: (id: string, position: ModalPosition) => void;
  bringToFront: (id: string) => void;
  navigateToPath: (id: string, path: string, title?: string) => void;
  goBack: (id: string) => void;
  canGoBack: (id: string) => boolean;
  setModalFileList: (id: string, files: FileItem[]) => void;
  setModalLoading: (id: string, loading: boolean) => void;
  getModalById: (id: string) => ModalInstance | undefined;
  setModalViewMode: (id: string, mode: ViewMode) => void;
  setModalIconColumns: (id: string, columns: 1 | 2 | 3 | 4) => void;
  setCopiedFiles: (files: string[]) => void;
  clearCopiedFiles: () => void;
}

export const useModalStore = create<ExplorerModalStore>((set, get) => ({
  modals: [],
  nextZIndex: 1000,
  copiedFiles: [],
  openModal: (title, path) =>
    set((state) => {
      const id = `modal-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        title,
        path,
        position: { x: 100 + state.modals.length * 30, y: 100 + state.modals.length * 30 },
        zIndex: state.nextZIndex,
        history: [path],
        historyIndex: 0,
        fileList: [],
        loading: true,
        viewMode: "icon",
        iconColumns: 4,
      };
      return {
        modals: [...state.modals, newModal],
        nextZIndex: state.nextZIndex + 1,
      };
    }),
  closeModal: (id) =>
    set((state) => ({
      modals: state.modals.filter((modal) => modal.id !== id),
    })),
  updatePosition: (id, position) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, position } : modal
      ),
    })),
  bringToFront: (id) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, zIndex: state.nextZIndex } : modal
      ),
      nextZIndex: state.nextZIndex + 1,
    })),
  navigateToPath: (id, path, title) =>
    set((state) => ({
      modals: state.modals.map((modal) => {
        if (modal.id !== id) return modal;
        
        // 截断当前索引之后的历史
        const newHistory = modal.history.slice(0, modal.historyIndex + 1);
        newHistory.push(path);
        
        return {
          ...modal,
          path,
          title: title || modal.title,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          fileList: [],
          loading: true,
        };
      }),
    })),
  goBack: (id) =>
    set((state) => ({
      modals: state.modals.map((modal) => {
        if (modal.id !== id || modal.historyIndex <= 0) return modal;
        
        const newIndex = modal.historyIndex - 1;
        return {
          ...modal,
          path: modal.history[newIndex],
          historyIndex: newIndex,
          fileList: [],
          loading: true,
        };
      }),
    })),
  canGoBack: (id) => {
    const modal = get().modals.find((m) => m.id === id);
    return modal ? modal.historyIndex > 0 : false;
  },
  setModalFileList: (id, files) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, fileList: files } : modal
      ),
    })),
  setModalLoading: (id, loading) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, loading } : modal
      ),
    })),
  getModalById: (id) => {
    return get().modals.find((m) => m.id === id);
  },
  setModalViewMode: (id, mode) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, viewMode: mode } : modal
      ),
    })),
  setModalIconColumns: (id, columns) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, iconColumns: columns } : modal
      ),
    })),
  setCopiedFiles: (files) => set({ copiedFiles: files }),
  clearCopiedFiles: () => set({ copiedFiles: [] }),
}));
