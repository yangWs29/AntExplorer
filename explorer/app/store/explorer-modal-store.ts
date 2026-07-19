import { create } from "zustand";

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number; // 文件大小（字节）
  modifiedTime?: Date; // 修改时间
}

export type ViewMode = "list" | "icon";

export type ModalType = "explorer" | "file-detail" | "compress" | "extract" | "analyze" | "batch-analyze" | "media-management" | "system";

export interface ModalInstance {
  id: string;
  type: ModalType;
  title: string;
  path: string;
  zIndex: number;
  history: string[]; // 导航历史
  historyIndex: number; // 当前历史索引
  fileList: FileItem[]; // 文件列表
  loading: boolean; // 加载状态
  viewMode: ViewMode; // 视图模式
  iconColumns: 1 | 2 | 3 | 4; // 图标模式列数
  fileDetail?: FileDetailData; // 文件详情数据
  compressData?: CompressData; // 压缩配置数据
  extractData?: ExtractData; // 解压缩配置数据
  analyzeData?: AnalyzeData; // 视频分析数据
  batchAnalyzeData?: BatchAnalyzeData; // 批量媒体管理数据
  mediaManagementData?: MediaManagementData; // 媒体管理数据
}

export interface FileDetailData {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedTime?: Date;
}

export interface CompressData {
  sourcePath: string; // 要压缩的文件/文件夹路径
  sourceName: string; // 文件/文件夹名称
  targetDir?: string; // 目标目录（可选）
}

export interface ExtractData {
  archivePath: string; // 压缩包路径
  archiveName: string; // 压缩包名称
  targetDir?: string; // 目标目录（可选）
}

export interface AnalyzeData {
  fileName: string; // 文件名
  filePath: string; // 文件路径
}

export interface BatchAnalyzeData {
  dirPath: string; // 目录路径
  dirName: string; // 目录名称
}

export interface MediaManagementData {
  rootDir: string; // 根目录
}

interface ExplorerModalStore {
  modals: ModalInstance[];
  nextZIndex: number;
  copiedFiles: string[]; // 全局复制的文件列表
  openModal: (title: string, path: string) => void;
  openFileDetailModal: (fileDetail: FileDetailData) => void;
  openCompressModal: (compressData: CompressData) => void;
  openExtractModal: (extractData: ExtractData) => void;
  openAnalyzeModal: (analyzeData: AnalyzeData) => void;
  openBatchAnalyzeModal: (batchAnalyzeData: BatchAnalyzeData) => void;
  openMediaManagementModal: (mediaManagementData: MediaManagementData) => void;
  openSystemModal: () => void;
  closeModal: (id: string) => void;
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
  nextZIndex: 100,
  copiedFiles: [],
  openModal: (title, path) =>
    set((state) => {
      const id = `modal-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        type: "explorer",
        title,
        path,
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
  openFileDetailModal: (fileDetail) =>
    set((state) => {
      const id = `detail-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        type: "file-detail",
        title: "文件详情",
        path: fileDetail.path,
        zIndex: state.nextZIndex,
        history: [fileDetail.path],
        historyIndex: 0,
        fileList: [],
        loading: false,
        viewMode: "icon",
        iconColumns: 4,
        fileDetail,
      };
      return {
        modals: [...state.modals, newModal],
        nextZIndex: state.nextZIndex + 1,
      };
    }),
  openCompressModal: (compressData) =>
    set((state) => {
      const id = `compress-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        type: "compress",
        title: "压缩文件",
        path: compressData.sourcePath,
        zIndex: state.nextZIndex,
        history: [compressData.sourcePath],
        historyIndex: 0,
        fileList: [],
        loading: false,
        viewMode: "icon",
        iconColumns: 4,
        compressData,
      };
      return {
        modals: [...state.modals, newModal],
        nextZIndex: state.nextZIndex + 1,
      };
    }),
  openExtractModal: (extractData) =>
    set((state) => {
      const id = `extract-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        type: "extract",
        title: "解压缩文件",
        path: extractData.archivePath,
        zIndex: state.nextZIndex,
        history: [extractData.archivePath],
        historyIndex: 0,
        fileList: [],
        loading: false,
        viewMode: "icon",
        iconColumns: 4,
        extractData,
      };
      return {
        modals: [...state.modals, newModal],
        nextZIndex: state.nextZIndex + 1,
      };
    }),
  openAnalyzeModal: (analyzeData) =>
    set((state) => {
      const id = `analyze-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        type: "analyze",
        title: "视频分析",
        path: analyzeData.filePath,
        zIndex: state.nextZIndex,
        history: [analyzeData.filePath],
        historyIndex: 0,
        fileList: [],
        loading: false,
        viewMode: "icon",
        iconColumns: 4,
        analyzeData,
      };
      return {
        modals: [...state.modals, newModal],
        nextZIndex: state.nextZIndex + 1,
      };
    }),
  openBatchAnalyzeModal: (batchAnalyzeData) =>
    set((state) => {
      const id = `batch-analyze-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        type: "batch-analyze",
        title: "批量媒体管理",
        path: batchAnalyzeData.dirPath,
        zIndex: state.nextZIndex,
        history: [batchAnalyzeData.dirPath],
        historyIndex: 0,
        fileList: [],
        loading: false,
        viewMode: "icon",
        iconColumns: 4,
        batchAnalyzeData,
      };
      return {
        modals: [...state.modals, newModal],
        nextZIndex: state.nextZIndex + 1,
      };
    }),
  openMediaManagementModal: (mediaManagementData) =>
    set((state) => {
      const id = `media-management-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        type: "media-management",
        title: "媒体管理",
        path: mediaManagementData.rootDir,
        zIndex: state.nextZIndex,
        history: [mediaManagementData.rootDir],
        historyIndex: 0,
        fileList: [],
        loading: false,
        viewMode: "icon",
        iconColumns: 4,
        mediaManagementData,
      };
      return {
        modals: [...state.modals, newModal],
        nextZIndex: state.nextZIndex + 1,
      };
    }),
  openSystemModal: () =>
    set((state) => {
      const id = `system-${Date.now()}-${Math.random()}`;
      const newModal: ModalInstance = {
        id,
        type: "system",
        title: "系统设置",
        path: "",
        zIndex: state.nextZIndex,
        history: [""],
        historyIndex: 0,
        fileList: [],
        loading: false,
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
  bringToFront: (id) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, zIndex: state.nextZIndex } : modal,
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
        modal.id === id ? { ...modal, fileList: files } : modal,
      ),
    })),
  setModalLoading: (id, loading) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, loading } : modal,
      ),
    })),
  getModalById: (id) => {
    return get().modals.find((m) => m.id === id);
  },
  setModalViewMode: (id, mode) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, viewMode: mode } : modal,
      ),
    })),
  setModalIconColumns: (id, columns) =>
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, iconColumns: columns } : modal,
      ),
    })),
  setCopiedFiles: (files) => set({ copiedFiles: files }),
  clearCopiedFiles: () => set({ copiedFiles: [] }),
}));
