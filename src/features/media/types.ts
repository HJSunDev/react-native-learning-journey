/** 从 expo-image-picker 选取的图片信息 */
export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  /** 文件大小（字节），部分平台或选取模式下可能为 undefined */
  fileSize?: number;
}

/** 经 expo-image-manipulator 处理后的图片信息 */
export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
}

/** 图片处理选项 */
export interface ProcessOptions {
  /** 最大宽度（像素），高度按比例缩放。不设置则保持原始尺寸 */
  maxWidth?: number;
  /** JPEG 压缩质量，0.0（最高压缩）到 1.0（无压缩），默认 0.8 */
  quality?: number;
}

/** 上传进度 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
