/** 通用轨道信息 */
export interface GeneralTrack {
    Count: string;
    Count_of_stream_of_this_kind: string;
    Kind_of_stream: string;
    StreamOrder?: string;
    Track_ID?: string;
    Format?: string;
    Format_Profile?: string;
    Format_Version?: string;
    Codec_ID?: string;
    Codec_ID_Compatible?: string;
    FileSize: string;
    Duration: string;
    OverallBitRate_Mode?: string;
    OverallBitRate?: string;
    FrameRate?: string;
    FrameCount?: string;
    IsStreamable?: string;
    Encoded_Date?: string;
    Tagged_Date?: string;
    File_Modified_Date?: string;
    File_Modified_Date_Local?: string;
    Title?: string;
    Artist?: string;
    Album?: string;
    Genre?: string;
    Track?: string;
    Recorded_Date?: string;
    Encoded_Application?: string;
    Encoded_Library?: string;
    [key: string]: string | undefined;
}
/** 视频轨道信息 */
export interface VideoTrack {
    Count: string;
    Count_of_stream_of_this_kind: string;
    Kind_of_stream: string;
    StreamOrder?: string;
    Track_ID?: string;
    Format: string;
    Format_Profile?: string;
    Format_Level?: string;
    Format_Tier?: string;
    Format_Settings?: string;
    Format_Settings_GOP?: string;
    Format_Settings_Wrapping?: string;
    Codec_ID?: string;
    Duration: string;
    BitRate?: string;
    BitRate_Mode?: string;
    Width: string;
    Height: string;
    PixelAspectRatio?: string;
    DisplayAspectRatio?: string;
    FrameRate_Mode?: string;
    FrameRate: string;
    FrameCount?: string;
    Standard?: string;
    Resolution?: string;
    ColorSpace?: string;
    ChromaSubsampling?: string;
    BitDepth?: string;
    ScanType?: string;
    ScanOrder?: string;
    Bits_Pixel_Frame?: string;
    Delay?: string;
    StreamSize?: string;
    Language?: string;
    Encoded_Date?: string;
    Tagged_Date?: string;
    ColorRange?: string;
    ColorPrimaries?: string;
    TransferCharacteristics?: string;
    MatrixCoefficients?: string;
    MasteringDisplay_ColorPrimaries?: string;
    MasteringDisplay_Luminance?: string;
    MaxCLL?: string;
    MaxFALL?: string;
    [key: string]: string | undefined;
}
/** 音频轨道信息 */
export interface AudioTrack {
    Count: string;
    Count_of_stream_of_this_kind: string;
    Kind_of_stream: string;
    StreamOrder?: string;
    Track_ID?: string;
    Format: string;
    Format_Profile?: string;
    Format_Settings?: string;
    Format_Settings_Endianness?: string;
    Format_Settings_Mode?: string;
    Codec_ID?: string;
    Duration: string;
    BitRate_Mode?: string;
    BitRate: string;
    Channel_s_: string;
    ChannelLayout?: string;
    SamplingRate: string;
    SamplingCount?: string;
    FrameCount?: string;
    Compression_Mode?: string;
    Delay?: string;
    Delay_Source?: string;
    StreamSize?: string;
    Language?: string;
    Title?: string;
    Encoded_Date?: string;
    Tagged_Date?: string;
    [key: string]: string | undefined;
}
/** 文本/字幕轨道信息 */
export interface TextTrack {
    Count: string;
    Count_of_stream_of_this_kind: string;
    Kind_of_stream: string;
    StreamOrder?: string;
    Track_ID?: string;
    Format: string;
    Format_Settings?: string;
    Codec_ID?: string;
    Duration?: string;
    BitRate?: string;
    FrameRate?: string;
    FrameCount?: string;
    Delay?: string;
    StreamSize?: string;
    Language?: string;
    Title?: string;
    Encoded_Date?: string;
    Tagged_Date?: string;
    [key: string]: string | undefined;
}
/** 图片轨道信息 */
export interface ImageTrack {
    Count: string;
    Count_of_stream_of_this_kind: string;
    Kind_of_stream: string;
    Format: string;
    Width: string;
    Height: string;
    ColorSpace?: string;
    ChromaSubsampling?: string;
    BitDepth?: string;
    Compression_Mode?: string;
    StreamSize?: string;
    [key: string]: string | undefined;
}
/** 菜单轨道信息 */
export interface MenuTrack {
    Count: string;
    Count_of_stream_of_this_kind: string;
    Kind_of_stream: string;
    Format?: string;
    Duration?: string;
    [key: string]: string | undefined;
}
/** MediaInfo 单个文件的完整结果 */
export interface MediaInfoResult {
    media: {
        "@ref": string;
        track: Array<(GeneralTrack & {
            "@type": "General";
        }) | (VideoTrack & {
            "@type": "Video";
        }) | (AudioTrack & {
            "@type": "Audio";
        }) | (TextTrack & {
            "@type": "Text";
        }) | (ImageTrack & {
            "@type": "Image";
        }) | (MenuTrack & {
            "@type": "Menu";
        })>;
    };
    creatingLibrary?: {
        name: string;
        version: string;
        url?: string;
    };
}
/** 解析后的便捷结构 */
export interface ParsedMediaInfo {
    /** 文件路径 */
    filePath: string;
    /** 创建库信息 */
    creatingLibrary?: {
        name: string;
        version: string;
        url?: string;
    };
    /** 通用信息 */
    general?: GeneralTrack;
    /** 视频轨道列表 */
    video: VideoTrack[];
    /** 音频轨道列表 */
    audio: AudioTrack[];
    /** 文本/字幕轨道列表 */
    text: TextTrack[];
    /** 图片轨道列表 */
    image: ImageTrack[];
    /** 菜单轨道列表 */
    menu: MenuTrack[];
}
/** 配置选项 */
export interface MediaInfoOptions {
    /** 自定义 mediainfo 二进制文件路径 */
    binPath?: string;
    /** 执行超时时间（毫秒），默认 30000 */
    timeout?: number;
}
/**
 * 将原始 MediaInfo 结果解析为便捷结构
 */
export declare function parseMediaInfoResult(raw: MediaInfoResult, filePath: string): ParsedMediaInfo;
/**
 * 获取媒体文件的 MediaInfo 信息（原始 JSON 结果）
 */
export declare function getMediaInfoRaw(filePath: string, options?: MediaInfoOptions): Promise<MediaInfoResult>;
/**
 * 获取媒体文件的 MediaInfo 信息（解析后的便捷结构）
 */
export declare function getMediaInfo(filePath: string, options?: MediaInfoOptions): Promise<ParsedMediaInfo>;
/**
 * 批量获取多个媒体文件的 MediaInfo 信息
 */
export declare function getMediaInfoBatch(filePaths: string[], options?: MediaInfoOptions): Promise<ParsedMediaInfo[]>;
/**
 * 获取 MediaInfo CLI 版本信息
 */
export declare function getMediaInfoVersion(options?: MediaInfoOptions): Promise<string>;
export default getMediaInfo;
//# sourceMappingURL=index.d.ts.map