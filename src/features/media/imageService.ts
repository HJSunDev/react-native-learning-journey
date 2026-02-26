import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type {
  PickedImage,
  ProcessedImage,
  ProcessOptions,
  UploadProgress,
} from './types';

/**
 * 从相册选取图片。
 * iOS 14+ 使用 PHPicker，无需请求完整相册权限（仅授权所选照片）。
 */
export async function pickImages(options?: {
  allowsMultipleSelection?: boolean;
  allowsEditing?: boolean;
  quality?: number;
  /** 最大选取数量（iOS 14+, Android），0 或不设置表示不限制 */
  selectionLimit?: number;
}): Promise<PickedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? false,
    allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
    quality: options?.quality ?? 0.8,
    selectionLimit: options?.selectionLimit,
  });

  if (result.canceled) return [];

  return result.assets.map((asset) => ({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize ?? undefined,
  }));
}

/**
 * 使用相机拍照。
 * 首次调用时自动请求相机权限（CAMERA permission）。
 */
export async function takePhoto(options?: {
  allowsEditing?: boolean;
  quality?: number;
}): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('需要相机权限才能拍照');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: options?.allowsEditing ?? false,
    quality: options?.quality ?? 0.8,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize ?? undefined,
  };
}

/**
 * 处理图片：压缩质量 + 调整尺寸。
 * 使用 expo-image-manipulator SDK 54 链式 API：manipulate → resize → renderAsync → saveAsync。
 */
export async function processImage(
  uri: string,
  options: ProcessOptions = {},
): Promise<ProcessedImage> {
  const { maxWidth, quality = 0.8 } = options;

  const context = ImageManipulator.manipulate(uri);

  if (maxWidth && maxWidth > 0) {
    context.resize({ width: maxWidth });
  }

  const ref = await context.renderAsync();
  const result = await ref.saveAsync({
    compress: quality,
    format: SaveFormat.JPEG,
  });

  const fileSize = getFileSize(result.uri);

  return {
    uri: result.uri,
    width: ref.width,
    height: ref.height,
    fileSize,
  };
}

/**
 * 获取文件大小（字节）。
 * SDK 54 使用 File 类的 size 属性（同步原生调用），替代已废弃的 getInfoAsync。
 */
export function getFileSize(uri: string): number | undefined {
  try {
    const file = new File(uri);
    return file.size > 0 ? file.size : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 模拟图片上传，支持进度回调和取消。
 *
 * 生产环境中应替换为真实的 multipart/form-data 上传：
 * ```ts
 * const formData = new FormData();
 * formData.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
 * await axios.post('/upload', formData, {
 *   headers: { 'Content-Type': 'multipart/form-data' },
 *   onUploadProgress: (e) => onProgress({ loaded: e.loaded, total: e.total, percentage: ... }),
 * });
 * ```
 */
export function mockUploadImage(
  _uri: string,
  onProgress: (progress: UploadProgress) => void,
): { promise: Promise<string>; cancel: () => void } {
  let cancelled = false;
  const totalBytes = 1024 * 1024;

  const promise = new Promise<string>((resolve, reject) => {
    let step = 0;
    const totalSteps = 20;

    const interval = setInterval(() => {
      if (cancelled) {
        clearInterval(interval);
        reject(new Error('上传已取消'));
        return;
      }

      step++;
      const percentage = Math.min(
        Math.round((step / totalSteps) * 100),
        step >= totalSteps ? 100 : 99,
      );

      onProgress({
        loaded: Math.round((percentage / 100) * totalBytes),
        total: totalBytes,
        percentage,
      });

      if (step >= totalSteps) {
        clearInterval(interval);
        resolve(`https://cdn.example.com/images/${Date.now()}.jpg`);
      }
    }, 150);
  });

  return { promise, cancel: () => { cancelled = true; } };
}

/** 格式化文件大小为人类可读字符串 */
export function formatFileSize(bytes: number | undefined): string {
  if (bytes == null) return '未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
