import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { z } from 'zod';

import { FormImagePicker } from '../../src/components/form/FormImagePicker';
import {
  formatFileSize,
  mockUploadImage,
  pickImages,
  processImage,
  takePhoto,
  type PickedImage,
  type ProcessedImage,
} from '../../src/features/media';
import { zodResolver } from '../../src/utils/zodResolver';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_IMAGE_URL = 'https://picsum.photos/id/29/800/600';
const BLURHASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

const CONTENT_FIT_OPTIONS = ['cover', 'contain', 'fill'] as const;

const QUALITY_OPTIONS = [
  { label: '低 0.3', value: 0.3 },
  { label: '中 0.5', value: 0.5 },
  { label: '高 0.7', value: 0.7 },
  { label: '原始', value: 1.0 },
];

const MAX_WIDTH_OPTIONS: { label: string; value: number | undefined }[] = [
  { label: '480', value: 480 },
  { label: '800', value: 800 },
  { label: '1200', value: 1200 },
  { label: '原始', value: undefined },
];

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </Text>
      {description && (
        <Text className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          {description}
        </Text>
      )}
      <View className="mt-4">{children}</View>
    </View>
  );
}

function ChipGroup({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: number | undefined }[];
  selected: number | undefined;
  onSelect: (value: number | undefined) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <Pressable
            key={opt.label}
            onPress={() => onSelect(opt.value)}
            className={`rounded-full border px-3 py-1.5 ${
              isSelected
                ? 'border-indigo-600 bg-indigo-600'
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600'
            }`}
          >
            <Text
              className={`text-sm ${
                isSelected
                  ? 'font-medium text-white'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 1: expo-image Showcase
// ---------------------------------------------------------------------------

function ExpoImageSection() {
  const [loadKey, setLoadKey] = useState(0);
  const [mounted, setMounted] = useState(true);
  const isDark = useColorScheme() === 'dark';

  const handleReload = () => {
    setMounted(false);
    setTimeout(() => {
      setLoadKey((k) => k + 1);
      setMounted(true);
    }, 50);
  };

  return (
    <SectionCard
      title="expo-image 图片展示"
      description="contentFit 对比 · blurhash 占位符 · 过渡动画"
    >
      {/* contentFit 对比 */}
      <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        contentFit 模式对比
      </Text>
      <View className="flex-row gap-2">
        {CONTENT_FIT_OPTIONS.map((mode) => (
          <View key={mode} className="flex-1">
            <View
              style={{
                height: 100,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
              }}
            >
              <Image
                source={DEMO_IMAGE_URL}
                style={{ flex: 1 }}
                contentFit={mode}
              />
            </View>
            <Text className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
              {mode}
            </Text>
          </View>
        ))}
      </View>

      {/* blurhash + transition */}
      <Text className="mb-2 mt-5 text-sm font-medium text-gray-700 dark:text-gray-300">
        blurhash 占位符 + 过渡动画
      </Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <View
            style={{
              height: 140,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {mounted && (
              <Image
                source={`https://picsum.photos/id/29/2000/1500?v=${loadKey}`}
                placeholder={{ blurhash: BLURHASH }}
                transition={500}
                style={{ flex: 1 }}
                contentFit="cover"
                cachePolicy="none"
              />
            )}
          </View>
          <Text className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
            有 blurhash
          </Text>
        </View>
        <View className="flex-1">
          <View
            style={{
              height: 140,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
            }}
          >
            {mounted && (
              <Image
                source={`https://picsum.photos/id/15/2000/1500?v=${loadKey}`}
                style={{ flex: 1 }}
                contentFit="cover"
                cachePolicy="none"
              />
            )}
          </View>
          <Text className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
            无占位符
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleReload}
        className="mt-3 items-center rounded-xl bg-gray-100 dark:bg-gray-700 py-2.5 active:bg-gray-200 dark:active:bg-gray-600"
      >
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="refresh" size={16} color={isDark ? '#D1D5DB' : '#6B7280'} />
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            重新加载（观察占位效果）
          </Text>
        </View>
      </Pressable>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Pick & Process
// ---------------------------------------------------------------------------

function PickAndProcessSection() {
  const [source, setSource] = useState<PickedImage | null>(null);
  const [result, setResult] = useState<ProcessedImage | null>(null);
  const [quality, setQuality] = useState<number | undefined>(0.7);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(800);
  const [isProcessing, setIsProcessing] = useState(false);
  const isDark = useColorScheme() === 'dark';

  const handlePickFromGallery = async () => {
    try {
      const images = await pickImages({ allowsEditing: true });
      if (images.length > 0) {
        setSource(images[0]);
        setResult(null);
      }
    } catch (e) {
      Alert.alert('选取失败', (e as Error).message);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await takePhoto({ allowsEditing: true });
      if (photo) {
        setSource(photo);
        setResult(null);
      }
    } catch (e) {
      Alert.alert('拍照失败', (e as Error).message);
    }
  };

  const handleProcess = async () => {
    if (!source) return;
    setIsProcessing(true);
    try {
      const processed = await processImage(source.uri, {
        quality: quality ?? 1.0,
        maxWidth,
      });
      setResult(processed);
    } catch (e) {
      Alert.alert('处理失败', (e as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SectionCard
      title="图片选取与处理"
      description="选择图片 → 调整参数 → 压缩处理 → 对比结果"
    >
      {/* 选取按钮 */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={handlePickFromGallery}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 py-3 active:bg-indigo-100 dark:active:bg-indigo-900"
        >
          <Ionicons name="images-outline" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
          <Text className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            相册选取
          </Text>
        </Pressable>
        <Pressable
          onPress={handleTakePhoto}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 py-3 active:bg-indigo-100 dark:active:bg-indigo-900"
        >
          <Ionicons name="camera-outline" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
          <Text className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            拍照
          </Text>
        </Pressable>
      </View>

      {source && (
        <>
          {/* 原始图片 */}
          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              原始图片
            </Text>
            <View
              style={{
                height: 200,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
              }}
            >
              <Image
                source={{ uri: source.uri }}
                style={{ flex: 1 }}
                contentFit="contain"
              />
            </View>
            <Text className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              {source.width} x {source.height}
              {source.fileSize ? ` · ${formatFileSize(source.fileSize)}` : ''}
            </Text>
          </View>

          {/* 处理参数 */}
          <View className="mt-4 gap-3">
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                压缩质量
              </Text>
              <ChipGroup
                options={QUALITY_OPTIONS}
                selected={quality}
                onSelect={setQuality}
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                最大宽度 (px)
              </Text>
              <ChipGroup
                options={MAX_WIDTH_OPTIONS}
                selected={maxWidth}
                onSelect={setMaxWidth}
              />
            </View>
          </View>

          {/* 处理按钮 */}
          <Pressable
            onPress={handleProcess}
            disabled={isProcessing}
            className="mt-4 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-sm font-semibold text-white">
                处理图片
              </Text>
            )}
          </Pressable>

          {/* 处理结果 */}
          {result && (
            <View className="mt-4">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                处理结果
              </Text>
              <View
                style={{
                  height: 200,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                }}
              >
                <Image
                  source={{ uri: result.uri }}
                  style={{ flex: 1 }}
                  contentFit="contain"
                />
              </View>
              <Text className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                {result.width} x {result.height}
                {result.fileSize ? ` · ${formatFileSize(result.fileSize)}` : ''}
              </Text>

              {/* 压缩效果对比 */}
              {source.fileSize != null && result.fileSize != null && (
                <View className="mt-3 rounded-xl bg-green-50 dark:bg-green-950 p-3">
                  <Text className="text-sm text-green-700 dark:text-green-400">
                    体积减少{' '}
                    {Math.round(
                      (1 - result.fileSize / source.fileSize) * 100,
                    )}
                    %（{formatFileSize(source.fileSize)} →{' '}
                    {formatFileSize(result.fileSize)}）
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Upload Simulation
// ---------------------------------------------------------------------------

function UploadSection() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const isDark = useColorScheme() === 'dark';

  const handlePick = async () => {
    try {
      const images = await pickImages({});
      if (images.length > 0) {
        setImageUri(images[0].uri);
        setUploadState('idle');
        setProgress(0);
      }
    } catch (e) {
      Alert.alert('选取失败', (e as Error).message);
    }
  };

  const handleUpload = () => {
    if (!imageUri) return;
    setUploadState('uploading');
    setProgress(0);

    const { promise, cancel } = mockUploadImage(imageUri, (p) => {
      setProgress(p.percentage);
    });

    cancelRef.current = cancel;

    promise
      .then(() => setUploadState('success'))
      .catch((e) => {
        if ((e as Error).message === '上传已取消') {
          setUploadState('idle');
          setProgress(0);
        } else {
          setUploadState('error');
        }
      });
  };

  const handleCancel = () => {
    cancelRef.current?.();
    cancelRef.current = null;
  };

  return (
    <SectionCard
      title="模拟上传"
      description="FormData + 进度跟踪（此处为 Mock 模拟）"
    >
      {!imageUri ? (
        <Pressable
          onPress={handlePick}
          className="items-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 py-8 active:bg-gray-100 dark:active:bg-gray-600"
        >
          <Ionicons name="cloud-upload-outline" size={32} color={isDark ? '#6B7280' : '#9CA3AF'} />
          <Text className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            选择图片以模拟上传
          </Text>
        </Pressable>
      ) : (
        <>
          <View
            style={{
              height: 160,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ flex: 1 }}
              contentFit="cover"
            />
          </View>

          {/* 进度条 */}
          {uploadState === 'uploading' && (
            <View className="mt-3">
              <View className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <View
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: '#6366F1',
                    borderRadius: 999,
                  }}
                />
              </View>
              <Text className="mt-1.5 text-center text-xs text-gray-400 dark:text-gray-500">
                {progress}%
              </Text>
            </View>
          )}

          {/* 状态提示 */}
          {uploadState === 'success' && (
            <View className="mt-3 rounded-xl bg-green-50 dark:bg-green-950 p-3">
              <Text className="text-center text-sm text-green-700 dark:text-green-400">
                上传成功
              </Text>
            </View>
          )}
          {uploadState === 'error' && (
            <View className="mt-3 rounded-xl bg-red-50 dark:bg-red-950 p-3">
              <Text className="text-center text-sm text-red-600 dark:text-red-400">
                上传失败
              </Text>
            </View>
          )}

          {/* 操作按钮 */}
          <View className="mt-3 flex-row gap-2">
            {uploadState === 'idle' && (
              <Pressable
                onPress={handleUpload}
                className="flex-1 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
              >
                <Text className="text-sm font-semibold text-white">
                  开始上传
                </Text>
              </Pressable>
            )}
            {uploadState === 'uploading' && (
              <Pressable
                onPress={handleCancel}
                className="flex-1 items-center rounded-xl bg-red-50 dark:bg-red-950 py-3 active:bg-red-100 dark:active:bg-red-900"
              >
                <Text className="text-sm font-medium text-red-600 dark:text-red-400">
                  取消上传
                </Text>
              </Pressable>
            )}
            {(uploadState === 'success' || uploadState === 'error') && (
              <>
                <Pressable
                  onPress={handlePick}
                  className="flex-1 items-center rounded-xl bg-gray-100 dark:bg-gray-700 py-3 active:bg-gray-200 dark:active:bg-gray-600"
                >
                  <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    重新选择
                  </Text>
                </Pressable>
                {uploadState === 'error' && (
                  <Pressable
                    onPress={handleUpload}
                    className="flex-1 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
                  >
                    <Text className="text-sm font-semibold text-white">
                      重试
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 4: FormImagePicker Demo
// ---------------------------------------------------------------------------

const demoSchema = z.object({
  images: z
    .array(z.string())
    .min(1, '请至少选择一张图片'),
});

type DemoFormData = z.infer<typeof demoSchema>;

function FormImagePickerSection() {
  const { control, handleSubmit, reset } = useForm<DemoFormData>({
    resolver: zodResolver(demoSchema),
    defaultValues: { images: [] },
  });

  const onSubmit = handleSubmit((data) => {
    Alert.alert(
      '表单数据',
      `已选择 ${data.images.length} 张图片\n\n${data.images
        .map((uri, i) => `${i + 1}. ...${uri.slice(-30)}`)
        .join('\n')}`,
    );
  });

  return (
    <SectionCard
      title="FormImagePicker 表单集成"
      description="react-hook-form + Zod 校验，可直接用于业务表单"
    >
      <FormImagePicker
        control={control}
        name="images"
        label="图片"
        required
        maxCount={4}
        columns={4}
      />

      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={onSubmit}
          className="flex-1 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
        >
          <Text className="text-sm font-semibold text-white">提交验证</Text>
        </Pressable>
        <Pressable
          onPress={() => reset()}
          className="items-center rounded-xl bg-gray-100 dark:bg-gray-700 px-5 py-3 active:bg-gray-200 dark:active:bg-gray-600"
        >
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
            重置
          </Text>
        </Pressable>
      </View>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MediaLabScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '图片与媒体' }} />

      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ExpoImageSection />
        <PickAndProcessSection />
        <UploadSection />
        <FormImagePickerSection />
      </ScrollView>
    </>
  );
}
