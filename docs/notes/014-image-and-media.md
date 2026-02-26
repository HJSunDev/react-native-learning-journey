# 014. 图片与媒体

## 1. 核心问题与概念

### 解决什么问题

移动端 App 的图片场景无处不在：头像、Feed 图片、商品图、相册。这些场景涉及完整的图片生命周期：**展示 → 选取 → 处理 → 上传**。每个环节在 React Native 中都有独立的技术栈和平台差异需要处理。

核心痛点：

- **展示性能**：RN 内置 `Image` 组件无磁盘缓存、无渐进加载、列表中重复解码导致帧率下降
- **选取差异**：iOS 使用 PHPicker（隐私权限粒度更细），Android 使用 Intent（系统级 Activity 切换），API 行为不一致
- **体积控制**：手机拍照动辄 3-8MB（4000x3000 像素），直接上传浪费带宽、存储和用户流量
- **上传流程**：multipart/form-data 编码、进度跟踪、断点续传、取消机制，每个都需要手动实现

### 技术栈与层级关系

```
┌───────────────────────────────────────────────┐
│              UI 层 (页面 / 表单)               │
│   FormImagePicker / 图片展示 / 上传进度 UI      │
├───────────────────────────────────────────────┤
│           imageService (业务封装层)            │
│   pickImages / takePhoto / processImage       │
│   mockUploadImage / getFileSize               │
├───────────────────────────────────────────────┤
│         Expo SDK 原生桥接层                    │
│  expo-image-picker   expo-image-manipulator   │
│  expo-file-system    expo-image               │
├───────────────────────────────────────────────┤
│            原生平台层                          │
│  iOS: PHPicker / UIImagePickerController      │
│       ImageIO / CoreGraphics                  │
│  Android: Intent / MediaStore                 │
│           BitmapFactory / ExifInterface       │
└───────────────────────────────────────────────┘
```

- **expo-image**：高性能图片展示组件，替代 RN 内置 `Image`。底层使用 SDWebImage（iOS）和 Glide（Android），内建多级缓存（内存 + 磁盘）、blurhash 占位符、过渡动画
- **expo-image-picker**：系统级图片/视频选取器。iOS 14+ 自动使用 PHPicker（无需完整相册权限），Android 走 Intent
- **expo-image-manipulator**：图片处理引擎。支持 resize、rotate、flip、crop、compress，SDK 54 使用链式 API（`manipulate → resize → renderAsync → saveAsync`）
- **expo-file-system**：文件系统操作。SDK 54 重构为面向对象 API（`File` / `Directory` 类），替代了旧的 `getInfoAsync` 等函数式 API。用于获取文件大小、管理缓存目录、读写文件

## 2. 核心用法 / 方案设计

### 场景 A: 高性能图片展示（expo-image）

expo-image 替代 RN 内置 `Image`，提供缓存、占位符和过渡动画：

```tsx
import { Image } from 'expo-image';

// 基础用法 — contentFit 控制图片在容器内的适配方式
<Image
  source={{ uri: 'https://example.com/photo.jpg' }}
  style={{ width: 200, height: 150 }}
  contentFit="cover"     // cover | contain | fill | none | scale-down
/>

// 高级用法 — blurhash 占位符 + 过渡动画
<Image
  source={{ uri: 'https://example.com/large-photo.jpg' }}
  placeholder={{ blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' }}
  transition={500}       // 加载完成后 500ms 渐入动画
  style={{ width: '100%', height: 200 }}
  contentFit="cover"
  cachePolicy="memory-disk"  // 内存 + 磁盘双层缓存
/>
```

**blurhash 是什么**：一个 ~30 字符的字符串（如 `LEHV6nWB2yk8pyo0adR*.7kCMdnj`），编码了一张图片的颜色分布信息。expo-image 拿到这个字符串后，在本地瞬间解码为一个约 4x3 像素的色块矩阵，平滑插值放大填满容器，作为图片加载期间的占位符。因为 hash 是从原图计算的，占位色块的色调、明暗分布会与真实图片大致吻合（蓝天绿地的照片 → 上蓝下绿的模糊色块）。

**生产环境的 blurhash 流程**：

```
┌─────────────────────────────────────────────────────────────────────┐
│ 服务端（图片上传时）                                                  │
│                                                                     │
│   用户上传原图 → 服务端用 blurhash 库计算 hash 字符串 → 存入数据库      │
│                  (Node: blurhash / sharp-blurhash)                  │
│                  (Go: buckket/go-blurhash)                          │
│                  计算耗时 < 50ms，hash 约 20-30 字符                 │
├─────────────────────────────────────────────────────────────────────┤
│ API 响应                                                            │
│                                                                     │
│   GET /api/posts → [                                                │
│     {                                                               │
│       "imageUrl": "https://cdn.example.com/photo-001.jpg",          │
│       "blurhash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj"                    │
│     }                                                               │
│   ]                                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ 客户端（渲染时）                                                     │
│                                                                     │
│   1. 拿到 blurhash → 瞬间解码为模糊色块 → 渲染占位（零网络开销）        │
│   2. 同时发起 imageUrl 网络请求                                      │
│   3. 图片加载完成 → transition 渐入动画替换占位符                      │
└─────────────────────────────────────────────────────────────────────┘
```

关键点：blurhash 字符串**由服务端生成**，随 API 响应一起下发。客户端不需要计算 hash，只负责传给 `placeholder` 渲染。体积极小（~30 字节 vs 缩略图几 KB），非常适合嵌入 JSON 响应。

**contentFit 模式对比**（同一张 800x600 的横版图片放入 200x200 的方形容器）：

| 模式        | 行为                           | 适用场景               |
| ----------- | ------------------------------ | ---------------------- |
| `cover`   | 等比缩放填满容器，超出部分裁切 | 头像、卡片封面、背景图 |
| `contain` | 等比缩放完整显示，可能留白     | 商品图、Logo、详情大图 |
| `fill`    | 拉伸填满容器，可能变形         | 极少使用，仅特殊背景   |

### 场景 B: 从相册选取图片

```tsx
import * as ImagePicker from "expo-image-picker";

// 单选（带裁剪编辑器）
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  allowsEditing: true, // 系统内置裁剪 UI
  quality: 0.8,
});

if (!result.canceled) {
  const asset = result.assets[0];
  console.log(asset.uri, asset.width, asset.height, asset.fileSize);
}

// 多选（限制最多 4 张）
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  allowsMultipleSelection: true,
  selectionLimit: 4, // iOS 14+, Android 有效
  quality: 0.8,
});

if (!result.canceled) {
  result.assets.forEach((asset) => {
    console.log(asset.uri);
  });
}
```

关键约束：`allowsEditing: true` 时系统强制单选（编辑 UI 一次只能处理一张），此时 `allowsMultipleSelection` 被忽略。

### 场景 C: 拍照

```tsx
// 首先请求相机权限
const { status } = await ImagePicker.requestCameraPermissionsAsync();
if (status !== "granted") {
  Alert.alert("提示", "需要相机权限才能拍照");
  return;
}

// 启动相机
const result = await ImagePicker.launchCameraAsync({
  allowsEditing: true,
  quality: 0.8,
});

if (!result.canceled) {
  const photo = result.assets[0];
  // photo.uri → 本地临时文件路径
}
```

### 场景 D: 图片处理（压缩 + 缩放）

SDK 54 的链式 API 替代了已废弃的 `manipulateAsync`：

```tsx
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// 链式操作：resize → renderAsync → saveAsync
const context = ImageManipulator.manipulate(originalUri);
context.resize({ width: 800 }); // 宽度 800px，高度按比例缩放

const ref = await context.renderAsync(); // 执行所有排队的操作
const result = await ref.saveAsync({
  compress: 0.7, // JPEG 质量 0.0-1.0
  format: SaveFormat.JPEG,
});

// result.uri → 处理后的本地临时文件路径
// ref.width, ref.height → 处理后的尺寸
```

链式 API 的设计：`resize()` / `rotate()` / `crop()` 等方法是**同步的**，只是将操作排入队列；`renderAsync()` 才真正在后台线程执行所有操作。

### 场景 E: 上传图片（FormData + 进度）

React Native 中的文件上传使用 `FormData`，与 Web 的 `File` 对象不同，RN 传入一个包含 `uri` / `name` / `type` 的对象：

```tsx
const formData = new FormData();

// RN 的 FormData 接受 { uri, name, type } 对象代替 File/Blob
formData.append("file", {
  uri: processedImage.uri,
  name: "photo.jpg",
  type: "image/jpeg",
} as any);

// 使用 Axios 上传（支持 onUploadProgress）
await axios.post("/api/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress: (event) => {
    const percentage = Math.round((event.loaded / (event.total ?? 1)) * 100);
    setProgress(percentage);
  },
});
```

`as any` 是必要的 — TypeScript 的 `FormData.append` 签名期望 `Blob`，但 RN 的 polyfill 接受 `{ uri, name, type }` 对象。这是 RN 特有的约定。

### 场景 F: 表单集成（FormImagePicker）

将图片选择封装为 react-hook-form 表单控件，与 FormInput / FormSelect 同级：

```tsx
import { FormImagePicker } from "../components/form";

const schema = z.object({
  images: z.array(z.string()).min(1, "请至少选择一张图片"),
});

const { control, handleSubmit } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { images: [] },
});

<FormImagePicker
  control={control}
  name="images"
  label="图片"
  required
  maxCount={4}
  columns={4}
/>;
```

FormImagePicker 内部通过 `Controller` 管理值（`string[]` — URI 数组），通过 `Alert.alert` 弹出来源选择（相册/拍照），以网格形式展示已选图片。

## 3. 深度原理与机制

### expo-image 缓存架构

```
图片请求流程：
source.uri → 内存缓存检查 → 命中 → 直接渲染
                ↓ 未命中
          磁盘缓存检查 → 命中 → 解码 → 写入内存缓存 → 渲染
                ↓ 未命中
          网络请求下载 → 写入磁盘缓存 → 解码 → 写入内存缓存 → 渲染
```

- **内存缓存**：解码后的位图数据，访问最快（纳秒级），但受内存压力限制，系统可能随时回收
- **磁盘缓存**：原始下载数据（编码状态），持久化存储，需要解码才能渲染
- **cachePolicy 选项**：`'none'`（不缓存）、`'disk'`（仅磁盘）、`'memory-disk'`（默认，双层缓存）

在 **FlatList/FlashList** 中使用 expo-image 时，配合 `recyclingKey` 可以避免 Cell 回收时闪烁旧图片：

```tsx
<Image
  source={{ uri: item.imageUrl }}
  recyclingKey={item.id} // Cell 被回收时，通过 key 判断是否需要重新加载
  style={{ width: "100%", height: 200 }}
/>
```

### expo-image-picker 权限模型

**iOS（14+）：PHPicker**

- `launchImageLibraryAsync` 使用 PHPicker，**无需任何权限**。系统仅将用户主动选择的照片授权给 App，App 无法访问整个相册
- `launchCameraAsync` 需要 `NSCameraUsageDescription`（相机权限描述），首次调用时系统弹窗

**Android：**

- `launchImageLibraryAsync` 需要 `READ_MEDIA_IMAGES`（Android 13+）或 `READ_EXTERNAL_STORAGE`（旧版本），Expo 自动处理
- `launchCameraAsync` 需要 `CAMERA` 权限

**app.json 插件配置**（用于自定义权限弹窗文案，Expo Go 中不需要）：

```json
[
  "expo-image-picker",
  {
    "photosPermission": "允许 App 访问相册以选择图片",
    "cameraPermission": "允许 App 使用相机以拍照"
  }
]
```

### 图片压缩原理（JPEG quality）

JPEG 压缩是有损压缩，`quality` 参数（0.0 - 1.0）控制 DCT（离散余弦变换）后的量化步长：

| quality | 体积（相对原图） | 视觉质量                  | 适用场景                       |
| ------- | ---------------- | ------------------------- | ------------------------------ |
| 1.0     | ~95%             | 无损（JPEG 仍有编码损失） | 需要最高质量的场景             |
| 0.7-0.8 | ~30-50%          | 肉眼几乎无差异            | **绝大多数上传场景推荐** |
| 0.5     | ~15-25%          | 细节处有轻微模糊          | 缩略图、预览图                 |
| 0.3     | ~8-15%           | 明显模糊                  | 仅作极低带宽场景               |

**推荐策略**：上传前统一 `resize({ width: 1200 })` + `compress: 0.7`，可将 5MB 原图降至 200-400KB，肉眼无感知差异。

### FormData 在 React Native 中的特殊行为

Web 中 `FormData.append` 接受 `File` 或 `Blob` 对象。RN 的 `FormData` polyfill 扩展了该接口，接受 `{ uri, name, type }` 对象：

```
Web:     formData.append('file', fileBlob)
                                    ↓
         浏览器读取 Blob 内容 → 编码为 multipart/form-data body

React Native: formData.append('file', { uri, name, type })
                                    ↓
              原生网络层直接读取 uri 对应的本地文件 → 流式编码为 multipart body
              （不经过 JS 线程，避免大文件阻塞）
```

这就是为什么 RN 中 `uri` 就够了 — 不需要先读取文件内容到 JS 内存，原生层直接从文件系统流式读取。

## 4. 最佳实践与坑

### 推荐做法

- **始终用 expo-image 替代 RN Image**：内建缓存 + 渐进加载 + 更好的列表性能。RN Image 每次挂载都重新解码，列表滚动时帧率明显低于 expo-image
- **上传前必须压缩**：`resize({ width: 1200 })` + `compress: 0.7` 是生产级默认参数，平衡质量与体积
- **在 FlatList 中使用 `recyclingKey`**：防止 Cell 回收时短暂显示上一个 Item 的图片
- **分离 imageService 层**：不要在组件中直接调用 `ImagePicker.launchImageLibraryAsync`，封装一层便于统一处理权限、错误、格式转换
- **FormImagePicker 的值类型用 `string[]`**：表单只存 URI，宽高/大小等元数据按需在提交时获取或由服务端处理

### 避免做法

- **不要在 iOS 上同时设置 `allowsEditing: true` 和 `allowsMultipleSelection: true`**：iOS 编辑模式强制单选，`allowsMultipleSelection` 被静默忽略
- **不要使用 `manipulateAsync`**（已废弃）：SDK 54 应使用 `ImageManipulator.manipulate()` 链式 API
- **不要使用 `getInfoAsync` / `readAsStringAsync` 等旧函数**（已废弃）：SDK 54 的 `expo-file-system` 重构为面向对象 API，旧的函数式 API 运行时会直接 throw。获取文件大小用 `new File(uri).size`，读取文件用 `new File(uri).text()`
- **不要将 base64 存入表单状态**：base64 编码后体积增加 ~33%，长字符串存入 state 触发大量序列化开销。始终用 `uri` 引用本地文件
- **不要忘记 `as any` 类型断言**：`FormData.append` 的 RN 扩展不在 TypeScript 标准签名中，不断言会报类型错误

## 5. 行动导向 (Action Guide)

### Step 1: 安装依赖

**这一步在干什么**: 安装图片生命周期各环节所需的 Expo SDK 模块。`expo-image` 项目已有，额外安装选取、处理和文件系统三个模块。

```bash
npx expo install expo-image-picker expo-image-manipulator expo-file-system
```

### Step 2: 配置 app.json 插件

**这一步在干什么**: 为 expo-image-picker 注册原生权限描述。Expo Go 中不需要（权限已预置），但自定义 Dev Client 和生产构建必须配置，否则首次请求权限时系统弹窗显示空白描述。

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "允许 App 访问相册以选择图片",
          "cameraPermission": "允许 App 使用相机以拍照"
        }
      ]
    ]
  }
}
```

### Step 3: 创建 imageService 业务封装层

**这一步在干什么**: 在 `src/features/media/` 目录下封装图片操作的核心函数。将 Expo SDK 的原生 API 包装为业务语义化的接口，统一错误处理和类型定义。

```typescript
// src/features/media/types.ts
export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
}

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
}

export interface ProcessOptions {
  maxWidth?: number;
  quality?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
```

```typescript
// src/features/media/imageService.ts
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type {
  PickedImage,
  ProcessedImage,
  ProcessOptions,
  UploadProgress,
} from "./types";

export async function pickImages(options?: {
  allowsMultipleSelection?: boolean;
  allowsEditing?: boolean;
  quality?: number;
  selectionLimit?: number;
}): Promise<PickedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
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

export async function takePhoto(options?: {
  allowsEditing?: boolean;
  quality?: number;
}): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    throw new Error("需要相机权限才能拍照");
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
  return { uri: result.uri, width: ref.width, height: ref.height, fileSize };
}

// SDK 54 使用 File 类的 size 属性（同步原生调用），替代已废弃的 getInfoAsync
export function getFileSize(uri: string): number | undefined {
  try {
    const file = new File(uri);
    return file.size > 0 ? file.size : undefined;
  } catch {
    return undefined;
  }
}

export function formatFileSize(bytes: number | undefined): string {
  if (bytes == null) return "未知";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
```

### Step 4: 创建 FormImagePicker 表单控件

**这一步在干什么**: 扩展 `src/components/form/` 表单控件库，新增图片选择控件。与 FormInput / FormSelect 同级，内置 Controller，以网格形式展示已选图片，通过 `Alert.alert` 弹出来源选择。

```tsx
// src/components/form/FormImagePicker.tsx
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";
import {
  Alert,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { pickImages, takePhoto } from "../../features/media";
import { FormField } from "./FormField";

interface FormImagePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  maxCount?: number;
  columns?: number;
}

export function FormImagePicker<T extends FieldValues>({
  control,
  name,
  label,
  required,
  maxCount = 9,
  columns = 4,
}: FormImagePickerProps<T>) {
  const { width: screenWidth } = useWindowDimensions();
  const gap = 8;
  const containerPadding = 16;
  const cellSize =
    (screenWidth - containerPadding * 2 - gap * (columns - 1)) / columns;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const images: string[] = (value as string[]) ?? [];
        const canAdd = images.length < maxCount;

        const handleAdd = () => {
          const remaining = maxCount - images.length;
          Alert.alert("添加图片", "", [
            {
              text: "从相册选择",
              onPress: async () => {
                const picked = await pickImages({
                  allowsMultipleSelection: true,
                  selectionLimit: remaining,
                });
                if (picked.length > 0) {
                  onChange([
                    ...images,
                    ...picked.slice(0, remaining).map((p) => p.uri),
                  ]);
                }
              },
            },
            {
              text: "拍照",
              onPress: async () => {
                const photo = await takePhoto({ quality: 0.8 });
                if (photo) onChange([...images, photo.uri]);
              },
            },
            { text: "取消", style: "cancel" },
          ]);
        };

        return (
          <FormField
            label={`${label}（最多 ${maxCount} 张）`}
            error={error?.message}
            required={required}
          >
            <View className="flex-row flex-wrap" style={{ gap }}>
              {images.map((uri, index) => (
                <View key={uri} style={{ width: cellSize, height: cellSize }}>
                  <Image
                    source={{ uri }}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 12,
                    }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() =>
                      onChange(images.filter((_, i) => i !== index))
                    }
                    className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-black/60"
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </Pressable>
                </View>
              ))}
              {canAdd && (
                <View style={{ width: cellSize, height: cellSize }}>
                  <Pressable
                    onPress={handleAdd}
                    className="flex-1 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
                  >
                    <Ionicons name="add" size={28} color="#9CA3AF" />
                    <Text className="mt-1 text-xs text-gray-400">
                      {images.length}/{maxCount}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </FormField>
        );
      }}
    />
  );
}
```

关键设计决策：

- **值类型 `string[]`**：只存 URI，不存宽高/大小等元数据，保持表单值轻量
- **`cellSize` 动态计算**：`(屏幕宽 - 容器内边距 - 间距) / 列数`，适配不同屏幕
- **style 与 className 分离**：外层 `View` 用 `style` 设置动态尺寸，内层 `Pressable` 用 `className` 设置设计样式（遵循 NativeWind 混用规则）

### Step 5: 创建 Media Lab 演示页面

**这一步在干什么**: 在 `app/(screens)/media-lab.tsx` 创建完整的图片与媒体演示页面，包含 4 个交互式 Section：expo-image 展示、图片选取与处理、上传模拟、FormImagePicker 表单集成。

页面位于 `(screens)` 路由组中，自动共享自定义 ScreenHeader，路由为 `/media-lab`。

完整代码见 `app/(screens)/media-lab.tsx`，核心结构：

```tsx
export default function MediaLabScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "图片与媒体" }} />
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        <ExpoImageSection /> {/* contentFit 对比 + blurhash 占位符 */}
        <PickAndProcessSection /> {/* 选取 → 参数调整 → 压缩处理 → 对比 */}
        <UploadSection /> {/* 进度条 + 取消/重试 */}
        <FormImagePickerSection /> {/* react-hook-form 表单集成演示 */}
      </ScrollView>
    </>
  );
}
```

### Step 6: 更新路由入口

**这一步在干什么**: 在 Explore Tab 的 `DEMO_SECTIONS` 数组中为"图片与媒体"条目添加 `route`，使其可点击跳转到 Media Lab 页面。

```tsx
// app/(tabs)/explore.tsx — 修改 media 条目
{
  id: 'media',
  title: '图片与媒体',
  description: '图片选择、裁剪压缩、上传进度',
  icon: 'image-outline',
  tags: ['expo-image', 'expo-image-picker'],
  route: '/media-lab' as Href,  // 新增：链接到演示页面
}
```

同时在 `src/components/form/index.ts` 中导出 `FormImagePicker`：

```ts
export { FormImagePicker } from "./FormImagePicker";
```
