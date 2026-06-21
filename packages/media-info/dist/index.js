"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMediaInfoResult = parseMediaInfoResult;
exports.getMediaInfoRaw = getMediaInfoRaw;
exports.getMediaInfo = getMediaInfo;
exports.getMediaInfoBatch = getMediaInfoBatch;
exports.getMediaInfoVersion = getMediaInfoVersion;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
// ========================
// Core Functions
// ========================
/**
 * 查找 mediainfo 二进制文件路径
 *
 * 优先级:
 * 1. 自定义路径 (options.binPath)
 * 2. 环境变量 MEDIAINFO_BIN
 * 3. 系统常见路径
 * 4. PATH 中的 mediainfo
 */
function findMediaInfoBin(customPath) {
    // 1. 使用自定义路径
    if (customPath) {
        if ((0, fs_1.existsSync)(customPath)) {
            return customPath;
        }
        throw new Error(`指定的 mediainfo 路径不存在: ${customPath}`);
    }
    // 2. 使用环境变量
    const envPath = process.env.MEDIAINFO_BIN;
    if (envPath && (0, fs_1.existsSync)(envPath)) {
        return envPath;
    }
    // 3. 尝试系统常见路径
    const commonPaths = [
        "/usr/local/bin/mediainfo",
        "/usr/bin/mediainfo",
        "/opt/homebrew/bin/mediainfo",
        "/opt/local/bin/mediainfo",
    ];
    for (const p of commonPaths) {
        if ((0, fs_1.existsSync)(p)) {
            return p;
        }
    }
    // 4. 使用 PATH 中的 mediainfo
    return "mediainfo";
}
/**
 * 执行 mediainfo 命令并获取 JSON 输出
 */
function execMediaInfo(binPath, filePath, timeout) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(binPath, ["--Output=JSON", filePath], { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`mediainfo 执行失败: ${error.message}${stderr ? `\nstderr: ${stderr}` : ""}`));
                return;
            }
            resolve(stdout);
        });
    });
}
/**
 * 将原始 MediaInfo 结果解析为便捷结构
 */
function parseMediaInfoResult(raw, filePath) {
    const result = {
        filePath,
        creatingLibrary: raw.creatingLibrary,
        video: [],
        audio: [],
        text: [],
        image: [],
        menu: [],
    };
    if (!raw.media?.track) {
        return result;
    }
    for (const track of raw.media.track) {
        const { "@type": type, ...rest } = track;
        switch (type) {
            case "General":
                result.general = rest;
                break;
            case "Video":
                result.video.push(rest);
                break;
            case "Audio":
                result.audio.push(rest);
                break;
            case "Text":
                result.text.push(rest);
                break;
            case "Image":
                result.image.push(rest);
                break;
            case "Menu":
                result.menu.push(rest);
                break;
        }
    }
    return result;
}
/**
 * 获取媒体文件的 MediaInfo 信息（原始 JSON 结果）
 */
async function getMediaInfoRaw(filePath, options) {
    const binPath = findMediaInfoBin(options?.binPath);
    const timeout = options?.timeout ?? 30000;
    const output = await execMediaInfo(binPath, filePath, timeout);
    return JSON.parse(output);
}
/**
 * 获取媒体文件的 MediaInfo 信息（解析后的便捷结构）
 */
async function getMediaInfo(filePath, options) {
    const raw = await getMediaInfoRaw(filePath, options);
    return parseMediaInfoResult(raw, filePath);
}
/**
 * 批量获取多个媒体文件的 MediaInfo 信息
 */
async function getMediaInfoBatch(filePaths, options) {
    return Promise.all(filePaths.map((fp) => getMediaInfo(fp, options)));
}
/**
 * 获取 MediaInfo CLI 版本信息
 */
async function getMediaInfoVersion(options) {
    const binPath = findMediaInfoBin(options?.binPath);
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(binPath, ["--Version"], { timeout: 10000 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`无法获取 mediainfo 版本: ${error.message}`));
                return;
            }
            // mediainfo --Version 输出到 stderr
            resolve((stderr || stdout).trim());
        });
    });
}
exports.default = getMediaInfo;
//# sourceMappingURL=index.js.map