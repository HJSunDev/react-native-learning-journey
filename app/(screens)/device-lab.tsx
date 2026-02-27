import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import {
  usePermission,
  type PermissionAdapter,
  type PermissionState,
} from '../../src/features/device';

// ---------------------------------------------------------------------------
// Permission Adapters（模块级常量，引用稳定，无需 useMemo）
// ---------------------------------------------------------------------------

// expo-camera 的权限函数不是模块顶级导出，
// 而是挂在 `export const Camera = { ... }` 命名导出对象上
const CAMERA_ADAPTER: PermissionAdapter = {
  get: Camera.getCameraPermissionsAsync,
  request: Camera.requestCameraPermissionsAsync,
};

const LOCATION_ADAPTER: PermissionAdapter = {
  get: Location.getForegroundPermissionsAsync,
  request: Location.requestForegroundPermissionsAsync,
};

// ---------------------------------------------------------------------------
// Permission Status Badge
// ---------------------------------------------------------------------------

const STATE_CONFIG: Record<PermissionState, { label: string; textColor: string; bg: string; darkBg: string }> = {
  loading: { label: '检查中', textColor: 'text-gray-500', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-700' },
  undetermined: { label: '未请求', textColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-950' },
  granted: { label: '已授权', textColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-950' },
  denied: { label: '已拒绝', textColor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50', darkBg: 'dark:bg-red-950' },
  blocked: { label: '已禁止', textColor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50', darkBg: 'dark:bg-red-950' },
};

function PermissionBadge({ state }: { state: PermissionState }) {
  const config = STATE_CONFIG[state];
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${config.bg} ${config.darkBg}`}>
      <Text className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Permission Dashboard
// ---------------------------------------------------------------------------

function PermissionDashboard({
  cameraState,
  locationState,
  onRequestCamera,
  onRequestLocation,
}: {
  cameraState: PermissionState;
  locationState: PermissionState;
  onRequestCamera: () => void;
  onRequestLocation: () => void;
}) {
  const isDark = useColorScheme() === 'dark';

  const items = [
    { name: '相机', icon: 'camera-outline' as const, state: cameraState, onRequest: onRequestCamera },
    { name: '定位', icon: 'location-outline' as const, state: locationState, onRequest: onRequestLocation },
  ];

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        权限状态总览
      </Text>
      <View className="gap-2">
        {items.map((item) => (
          <Pressable
            key={item.name}
            onPress={item.state !== 'granted' ? item.onRequest : undefined}
            className="flex-row items-center rounded-xl bg-gray-50 dark:bg-gray-700 p-3 active:bg-gray-100 dark:active:bg-gray-600"
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
              <Ionicons name={item.icon} size={20} color={isDark ? '#818CF8' : '#6366F1'} />
            </View>
            <Text className="ml-3 flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
              {item.name}
            </Text>
            <PermissionBadge state={item.state} />
          </Pressable>
        ))}
      </View>
      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          点击未授权的权限条目可触发系统权限请求弹窗。
          {'\n'}Clipboard 和 Share API 无需额外权限。
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Camera
// ---------------------------------------------------------------------------

type CameraMode = 'photo' | 'scan';

function CameraSection({ isGranted, onRequest }: { isGranted: boolean; onRequest: () => Promise<boolean> }) {
  const isDark = useColorScheme() === 'dark';
  const cameraRef = useRef<CameraView>(null);
  const [active, setActive] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [mode, setMode] = useState<CameraMode>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  // 用 ref 做同步屏障：onBarcodeScanned 在原生线程逐帧触发，
  // useState 的异步批量更新无法在下一帧前生效，会导致门控穿透
  const scannedRef = useRef(false);

  const handleOpen = useCallback(async () => {
    if (!isGranted) {
      const granted = await onRequest();
      if (!granted) return;
    }
    setActive(true);
    setScanResult(null);
    scannedRef.current = false;
  }, [isGranted, onRequest]);

  const handleCapture = useCallback(async () => {
    const result = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (result?.uri) {
      setPhotoUri(result.uri);
      setActive(false);
    }
  }, []);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      setScanResult(data);
      setActive(false);
    },
    [],
  );

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons name="camera" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          相机
        </Text>
      </View>

      {/* 模式切换 */}
      <View className="flex-row gap-2 mb-3">
        {(['photo', 'scan'] as CameraMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              scannedRef.current = false;
              setScanResult(null);
            }}
            className={`flex-1 items-center rounded-xl py-2.5 ${
              mode === m
                ? 'bg-indigo-600'
                : 'bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
            }`}
          >
            <Text className={`text-sm font-medium ${mode === m ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
              {m === 'photo' ? '拍照' : '扫码'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 相机预览区 */}
      {active ? (
        <View className="rounded-xl overflow-hidden mb-3" style={{ height: 300 }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
            onBarcodeScanned={mode === 'scan' ? handleBarcode : undefined}
            barcodeScannerSettings={mode === 'scan' ? { barcodeTypes: ['qr', 'ean13', 'code128'] } : undefined}
          >
            {/* 相机控制覆盖层 */}
            <View className="flex-1 justify-end items-center pb-4">
              <View className="flex-row items-center gap-6">
                <Pressable
                  onPress={() => setActive(false)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
                >
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </Pressable>

                {mode === 'photo' && (
                  <Pressable
                    onPress={handleCapture}
                    className="h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/30 active:bg-white/50"
                  >
                    <View className="h-12 w-12 rounded-full bg-white" />
                  </Pressable>
                )}

                <Pressable
                  onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                  className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
                >
                  <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </CameraView>
        </View>
      ) : (
        <Pressable
          onPress={handleOpen}
          className="h-40 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 mb-3 active:bg-gray-200 dark:active:bg-gray-600"
        >
          <Ionicons
            name={mode === 'photo' ? 'camera-outline' : 'scan-outline'}
            size={36}
            color={isDark ? '#6B7280' : '#9CA3AF'}
          />
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            点击{mode === 'photo' ? '打开相机' : '开始扫码'}
          </Text>
        </Pressable>
      )}

      {/* 拍照结果 */}
      {photoUri && (
        <View className="rounded-xl overflow-hidden">
          <Image source={{ uri: photoUri }} style={{ height: 200, width: '100%' }} contentFit="cover" />
          <Pressable
            onPress={() => setPhotoUri(null)}
            className="absolute top-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/50"
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* 扫码结果 */}
      {scanResult && (
        <View className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-3">
          <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
            扫描结果
          </Text>
          <Text className="text-sm text-emerald-800 dark:text-emerald-200 font-mono" selectable>
            {scanResult}
          </Text>
          <Pressable
            onPress={() => {
              scannedRef.current = false;
              setScanResult(null);
              setActive(true);
            }}
            className="mt-2 self-start rounded-lg bg-emerald-600 px-3 py-1.5 active:bg-emerald-700"
          >
            <Text className="text-xs font-medium text-white">继续扫描</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Location
// ---------------------------------------------------------------------------

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address?: string;
}

function LocationSection({ isGranted, onRequest }: { isGranted: boolean; onRequest: () => Promise<boolean> }) {
  const isDark = useColorScheme() === 'dark';
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetLocation = useCallback(async () => {
    if (!isGranted) {
      const granted = await onRequest();
      if (!granted) return;
    }

    setLoading(true);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const data: LocationData = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };

      // 反向地理编码：坐标 → 可读地址
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (geo) {
          data.address = [geo.country, geo.region, geo.city, geo.district, geo.street]
            .filter(Boolean)
            .join(' ');
        }
      } catch {
        // 反向地理编码可能因网络或配额失败，不阻塞主流程
      }

      setLocation(data);
    } catch (e) {
      Alert.alert('定位失败', e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [isGranted, onRequest]);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons name="location" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          定位
        </Text>
      </View>

      <Pressable
        onPress={handleGetLocation}
        disabled={loading}
        className={`items-center rounded-xl py-3 mb-3 ${
          loading
            ? 'bg-gray-200 dark:bg-gray-600'
            : 'bg-indigo-600 active:bg-indigo-700'
        }`}
      >
        <Text className="text-sm font-semibold text-white">
          {loading ? '定位中...' : '获取当前位置'}
        </Text>
      </Pressable>

      {location && (
        <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3 gap-2">
          <View className="flex-row items-center">
            <Text className="w-16 text-xs text-gray-500 dark:text-gray-400">纬度</Text>
            <Text className="text-sm font-mono text-gray-800 dark:text-gray-200">
              {location.latitude.toFixed(6)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="w-16 text-xs text-gray-500 dark:text-gray-400">经度</Text>
            <Text className="text-sm font-mono text-gray-800 dark:text-gray-200">
              {location.longitude.toFixed(6)}
            </Text>
          </View>
          {location.accuracy != null && (
            <View className="flex-row items-center">
              <Text className="w-16 text-xs text-gray-500 dark:text-gray-400">精度</Text>
              <Text className="text-sm font-mono text-gray-800 dark:text-gray-200">
                ±{location.accuracy.toFixed(0)}m
              </Text>
            </View>
          )}
          {location.address && (
            <View className="flex-row items-start mt-1 pt-2 border-t border-gray-200 dark:border-gray-600">
              <Text className="w-16 text-xs text-gray-500 dark:text-gray-400">地址</Text>
              <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                {location.address}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Clipboard
// ---------------------------------------------------------------------------

function ClipboardSection() {
  const isDark = useColorScheme() === 'dark';
  const [inputText, setInputText] = useState('Hello from RN Journey!');
  const [pastedText, setPastedText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inputText]);

  const handlePaste = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    setPastedText(text || '(剪贴板为空)');
  }, []);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons name="clipboard" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          剪贴板
        </Text>
        <View className="ml-auto rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5">
          <Text className="text-xs text-emerald-600 dark:text-emerald-400">无需权限</Text>
        </View>
      </View>

      <TextInput
        value={inputText}
        onChangeText={setInputText}
        className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-[14px] text-gray-800 dark:text-gray-200 mb-3"
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        placeholder="输入要复制的文本..."
      />

      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={handleCopy}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#FFFFFF" />
          <Text className="text-sm font-semibold text-white">
            {copied ? '已复制' : '复制'}
          </Text>
        </Pressable>
        <Pressable
          onPress={handlePaste}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 py-3 active:bg-gray-200 dark:active:bg-gray-600"
        >
          <Ionicons name="clipboard-outline" size={16} color={isDark ? '#D1D5DB' : '#374151'} />
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">粘贴</Text>
        </Pressable>
      </View>

      {pastedText !== null && (
        <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            从剪贴板读取
          </Text>
          <Text className="text-sm text-gray-800 dark:text-gray-200" selectable>
            {pastedText}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 5: Share
// ---------------------------------------------------------------------------

function ShareSection() {
  const isDark = useColorScheme() === 'dark';

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: 'RN Journey',
        message: '来看看我用 React Native 做的 App！\nhttps://github.com/rn-journey',
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'User did not share') {
        Alert.alert('分享失败', e.message);
      }
    }
  }, []);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons name="share-social" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          系统分享
        </Text>
        <View className="ml-auto rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5">
          <Text className="text-xs text-emerald-600 dark:text-emerald-400">无需权限</Text>
        </View>
      </View>

      <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        调用 React Native 内置 Share API 唤起系统原生分享面板，支持文本和 URL。
      </Text>

      <Pressable
        onPress={handleShare}
        className="flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
      >
        <Ionicons name="share-outline" size={18} color="#FFFFFF" />
        <Text className="text-sm font-semibold text-white">打开分享面板</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 6: Architecture Diagram
// ---------------------------------------------------------------------------

function ArchitectureDiagram() {
  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        权限请求生命周期
      </Text>
      <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
        <Text className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-5">
          {'App 首次访问设备功能\n'}
          {'  ↓\n'}
          {'usePermission(adapter) → mount 时 get()\n'}
          {'  ↓\n'}
          {'┌──────────── 状态判断 ────────────┐\n'}
          {'│ granted      → 直接使用 API      │\n'}
          {'│ undetermined → 弹窗请求          │\n'}
          {'│ blocked      → 引导至系统设置     │\n'}
          {'└─────────────────────────────────┘\n'}
          {'  ↓ request()\n'}
          {'系统权限弹窗 (OS Dialog)\n'}
          {'  ├── 允许 → state = granted\n'}
          {'  ├── 拒绝 → state = denied\n'}
          {'  └── 不再询问 → state = blocked\n'}
          {'                  ↓\n'}
          {'        Alert: 引导用户打开设置\n'}
          {'        Linking.openSettings()'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function DeviceLabScreen() {
  const cameraPermission = usePermission(CAMERA_ADAPTER, '相机');
  const locationPermission = usePermission(LOCATION_ADAPTER, '定位');

  return (
    <>
      <Stack.Screen options={{ title: '权限与设备 API' }} />

      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <PermissionDashboard
          cameraState={cameraPermission.state}
          locationState={locationPermission.state}
          onRequestCamera={cameraPermission.request}
          onRequestLocation={locationPermission.request}
        />

        <ArchitectureDiagram />

        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          需要权限的 API
        </Text>

        <CameraSection
          isGranted={cameraPermission.isGranted}
          onRequest={cameraPermission.request}
        />

        <LocationSection
          isGranted={locationPermission.isGranted}
          onRequest={locationPermission.request}
        />

        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          无需权限的 API
        </Text>

        <ClipboardSection />
        <ShareSection />
      </ScrollView>
    </>
  );
}
