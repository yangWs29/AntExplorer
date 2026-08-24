import { create } from "zustand";
import { FileItem } from "./explorer-modal-store";

export type { FileItem } from "./explorer-modal-store";

export type FinderViewMode = "icon" | "list" | "column";
export type ClipboardMode = "copy" | "move" | null;

export interface FileStats {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
  createdTime: Date;
  permissions: string;
  linkCount: number;
}

const DEFAULT_ROOT = process.env.NEXT_PUBLIC_DIR || "/";

/** 单个 Finder 窗口的状态 */
export interface FinderModalState {
  // 导航
  currentPath: string;
  history: string[];
  historyIndex: number;
  // 文件数据
  fileList: FileItem[];
  loading: boolean;
  // 视图
  viewMode: FinderViewMode;
  // 选中
  selectedFiles: string[];
  lastSelectedIndex: number;
  // 剪贴板
  clipboardFiles: string[];
  clipboardMode: ClipboardMode;
  // 分栏视图专用
  columnPaths: string[];
  columnSelections: Record<number, string>;
  // 详情弹窗
  detailFile: FileStats | null;
  // 重命名
  renamingFile: { path: string; name: string } | null;
}

/** Store 内部结构：按 modalId 隔离 */
interface FinderStore {
  modals: Record<string, FinderModalState>;
  // Actions - 导航
  navigateTo: (modalId: string, path: string, title?: string) => void;
  goBack: (modalId: string) => void;
  goForward: (modalId: string) => void;
  canGoBack: (modalId: string) => boolean;
  canGoForward: (modalId: string) => boolean;
  goUp: (modalId: string) => string | null;
  // Actions - 文件数据
  setFileList: (modalId: string, files: FileItem[]) => void;
  setLoading: (modalId: string, loading: boolean) => void;
  // Actions - 视图
  setViewMode: (modalId: string, mode: FinderViewMode) => void;
  // Actions - 选中
  selectFile: (
    modalId: string,
    path: string,
    index: number,
    multi?: boolean,
    range?: boolean,
  ) => void;
  clearSelection: (modalId: string) => void;
  selectAll: (modalId: string) => void;
  // Actions - 剪贴板
  copyFiles: (modalId: string, paths: string[]) => void;
  cutFiles: (modalId: string, paths: string[]) => void;
  clearClipboard: (modalId: string) => void;
  // Actions - 分栏
  setColumnPath: (modalId: string, level: number, path: string) => void;
  setColumnSelection: (
    modalId: string,
    level: number,
    path: string,
  ) => void;
  resetColumnView: (modalId: string) => void;
  // Actions - 详情
  setDetailFile: (modalId: string, file: FileStats | null) => void;
  // Actions - 重命名
  setRenamingFile: (
    modalId: string,
    file: { path: string; name: string } | null,
  ) => void;
  // 初始化（挂载时设置初始路径）
  initModal: (modalId: string, initialPath: string) => void;
}

/** 获取或创建指定 modal 的默认状态 */
function getOrCreate(state: FinderStore, modalId: string): FinderModalState {
  return (
    state.modals[modalId] ?? {
      currentPath: DEFAULT_ROOT,
      history: [DEFAULT_ROOT],
      historyIndex: 0,
      fileList: [],
      loading: false,
      viewMode: "icon",
      selectedFiles: [],
      lastSelectedIndex: -1,
      clipboardFiles: [],
      clipboardMode: null,
      columnPaths: [DEFAULT_ROOT],
      columnSelections: {},
      detailFile: null,
      renamingFile: null,
    }
  );
}

export const useFinderStore = create<FinderStore>((set, get) => ({
  modals: {},

  initModal: (modalId, initialPath) =>
    set((state) => {
      // 已有状态则保留（关闭后重新打开同一窗口时恢复上次位置）
      if (state.modals[modalId]) return state;
      return {
        modals: {
          ...state.modals,
          [modalId]: {
            currentPath: initialPath,
            history: [initialPath],
            historyIndex: 0,
            fileList: [],
            loading: false,
            viewMode: "icon",
            selectedFiles: [],
            lastSelectedIndex: -1,
            clipboardFiles: [],
            clipboardMode: null,
            columnPaths: [initialPath],
            columnSelections: {},
            detailFile: null,
            renamingFile: null,
          },
        },
      };
    }),

  navigateTo: (modalId, path) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      const newHistory = m.history.slice(0, m.historyIndex + 1);
      newHistory.push(path);
      return {
        modals: {
          ...state.modals,
          [modalId]: {
            ...m,
            currentPath: path,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            fileList: [],
            loading: true,
            selectedFiles: [],
            lastSelectedIndex: -1,
          },
        },
      };
    }),

  goBack: (modalId) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      if (m.historyIndex <= 0) return state;
      const newIndex = m.historyIndex - 1;
      return {
        modals: {
          ...state.modals,
          [modalId]: {
            ...m,
            currentPath: m.history[newIndex],
            historyIndex: newIndex,
            fileList: [],
            loading: true,
            selectedFiles: [],
            lastSelectedIndex: -1,
          },
        },
      };
    }),

  goForward: (modalId) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      if (m.historyIndex >= m.history.length - 1) return state;
      const newIndex = m.historyIndex + 1;
      return {
        modals: {
          ...state.modals,
          [modalId]: {
            ...m,
            currentPath: m.history[newIndex],
            historyIndex: newIndex,
            fileList: [],
            loading: true,
            selectedFiles: [],
            lastSelectedIndex: -1,
          },
        },
      };
    }),

  canGoBack: (modalId) => {
    const s = get();
    const m = s.modals[modalId];
    return m ? m.historyIndex > 0 : false;
  },

  canGoForward: (modalId) => {
    const s = get();
    const m = s.modals[modalId];
    return m ? m.historyIndex < m.history.length - 1 : false;
  },

  goUp: (modalId) => {
    const s = get();
    const m = s.modals[modalId];
    if (!m) return null;
    const parent = m.currentPath.substring(0, m.currentPath.lastIndexOf("/"));
    if (!parent || parent === m.currentPath) return null;
    const upPath = parent || "/";
    get().navigateTo(modalId, upPath);
    return upPath;
  },

  setFileList: (modalId, files) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return {
        modals: { ...state.modals, [modalId]: { ...m, fileList: files, loading: false } },
      };
    }),

  setLoading: (modalId, loading) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return { modals: { ...state.modals, [modalId]: { ...m, loading } } };
    }),

  setViewMode: (modalId, mode) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      if (mode === "column") {
        return {
          modals: {
            ...state.modals,
            [modalId]: { ...m, viewMode: mode, columnPaths: [m.currentPath], columnSelections: {} },
          },
        };
      }
      return { modals: { ...state.modals, [modalId]: { ...m, viewMode: mode } } };
    }),

  selectFile: (modalId, path, index, multi, range) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      if (range && m.lastSelectedIndex >= 0) {
        const start = Math.min(m.lastSelectedIndex, index);
        const end = Math.max(m.lastSelectedIndex, index);
        const paths = m.fileList.slice(start, end + 1).map((f) => f.path);
        return {
          modals: {
            ...state.modals,
            [modalId]: {
              ...m,
              selectedFiles: [...new Set([...m.selectedFiles, ...paths])],
              lastSelectedIndex: index,
            },
          },
        };
      }
      if (multi) {
        const exists = m.selectedFiles.includes(path);
        return {
          modals: {
            ...state.modals,
            [modalId]: {
              ...m,
              selectedFiles: exists
                ? m.selectedFiles.filter((p) => p !== path)
                : [...m.selectedFiles, path],
              lastSelectedIndex: index,
            },
          },
        };
      }
      return {
        modals: {
          ...state.modals,
          [modalId]: { ...m, selectedFiles: [path], lastSelectedIndex: index },
        },
      };
    }),

  clearSelection: (modalId) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return {
        modals: { ...state.modals, [modalId]: { ...m, selectedFiles: [], lastSelectedIndex: -1 } },
      };
    }),

  selectAll: (modalId) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return {
        modals: {
          ...state.modals,
          [modalId]: {
            ...m,
            selectedFiles: m.fileList.map((f) => f.path),
            lastSelectedIndex: m.fileList.length - 1,
          },
        },
      };
    }),

  copyFiles: (modalId, paths) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return {
        modals: { ...state.modals, [modalId]: { ...m, clipboardFiles: paths, clipboardMode: "copy" } },
      };
    }),

  cutFiles: (modalId, paths) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return {
        modals: { ...state.modals, [modalId]: { ...m, clipboardFiles: paths, clipboardMode: "move" } },
      };
    }),

  clearClipboard: (modalId) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return {
        modals: { ...state.modals, [modalId]: { ...m, clipboardFiles: [], clipboardMode: null } },
      };
    }),

  setColumnPath: (modalId, level, path) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      const newPaths = m.columnPaths.slice(0, level + 1);
      newPaths.push(path);
      const newSelections = { ...m.columnSelections };
      Object.keys(newSelections).forEach((key) => {
        if (parseInt(key) >= level) delete newSelections[parseInt(key)];
      });
      return {
        modals: { ...state.modals, [modalId]: { ...m, columnPaths: newPaths, columnSelections: newSelections } },
      };
    }),

  setColumnSelection: (modalId, level, path) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      const newSelections = { ...m.columnSelections, [level]: path };
      Object.keys(newSelections).forEach((key) => {
        if (parseInt(key) > level) delete newSelections[parseInt(key)];
      });
      return {
        modals: { ...state.modals, [modalId]: { ...m, columnSelections: newSelections } },
      };
    }),

  resetColumnView: (modalId) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return {
        modals: { ...state.modals, [modalId]: { ...m, columnPaths: [m.currentPath], columnSelections: {} } },
      };
    }),

  setDetailFile: (modalId, file) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return { modals: { ...state.modals, [modalId]: { ...m, detailFile: file } } };
    }),

  setRenamingFile: (modalId, file) =>
    set((state) => {
      const m = getOrCreate(state, modalId);
      return { modals: { ...state.modals, [modalId]: { ...m, renamingFile: file } } };
    }),
}));

/** 获取指定 modal 的当前状态（用于非 React 上下文，如拖拽回调） */
export function getModalState(modalId: string): FinderModalState {
  const state = useFinderStore.getState();
  return getOrCreate(state, modalId);
}
