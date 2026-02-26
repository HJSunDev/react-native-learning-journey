# 013. 表单体系

## 1. 核心问题与概念

### 解决什么问题

移动端表单是用户**输入数据的唯一通道**（注册、发布、搜索、设置）。与 Web 不同，React Native 没有原生 `<form>`、`<select>`、`<textarea>` 元素，所有表单控件都需要手动组装。

核心痛点：

- **状态管理**：每个字段一个 `useState` + `onChangeText`，10 个字段就是 10 对状态，代码膨胀且易出错
- **校验逻辑**：手写 `if/else` 校验分散在提交函数中，难以复用和测试
- **性能**：每次输入都触发整个表单重渲染，字段多时可感知卡顿
- **UX 细节**：焦点跳转、键盘管理、错误提示时机，每个都需要手动处理

### 技术栈与层级关系

```
┌─────────────────────────────────────────────┐
│           UI 层 (表单页面)                   │
│   使用 FormInput / FormSelect 等控件组装表单  │
├─────────────────────────────────────────────┤
│      react-hook-form (表单状态引擎)          │
│   Controller 桥接 RN 组件，管理值/错误/提交   │
├─────────────────────────────────────────────┤
│         Zod v4 (Schema 校验)                 │
│   声明式定义字段规则，通过 Resolver 桥接 RHF   │
├─────────────────────────────────────────────┤
│      zodResolver (自定义适配器)              │
│   将 Zod safeParse 结果转换为 RHF FieldErrors│
└─────────────────────────────────────────────┘
```

- **react-hook-form (RHF)**：表单状态管理库。核心优势是**非受控渲染** — 字段值变化不触发整个表单重渲染，只有该字段的 Controller 重渲染。在 Web 中直接用 `register` 挂载 DOM 元素；在 RN 中必须用 `Controller` 包裹每个组件，因为 RN 组件不是 DOM 元素。
- **Zod v4**：TypeScript-first 的 Schema 校验库。用声明式链式 API 定义字段规则（`z.string().min(2).max(50)`），替代手写 `if/else`。Schema 同时产出 TypeScript 类型（`z.infer<typeof schema>`），一处定义、类型与校验双重保障。
- **zodResolver**：桥接层。RHF 不内置任何校验库，通过 Resolver 模式对接外部校验。官方 `@hookform/resolvers` 与 Zod v4 存在类型兼容问题，本项目使用自定义 Resolver。

### 为什么 RN 表单必须用 Controller

Web 中 RHF 的 `register()` 直接操作 DOM 元素的 `value` 和 `onChange`：

```tsx
// Web：register 直接返回 { name, onChange, onBlur, ref }，挂到 <input> 上
<input {...register('email')} />
```

RN 中没有 DOM，`TextInput` 是 React 组件而非原生 HTML 元素。必须用 `Controller` 做桥接：

```tsx
// RN：Controller 提供 field 对象，手动绑定到 TextInput 的 props
<Controller
  control={control}
  name="email"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextInput value={value} onChangeText={onChange} onBlur={onBlur} />
  )}
/>
```

**Controller 的职责**：

1. 订阅 RHF 的表单 store，获取当前字段的 `value`
2. 把 `onChange` / `onBlur` 回调绑定到 RN 组件
3. 提供 `fieldState.error` 用于展示校验错误
4. 仅当本字段的值或错误变化时触发重渲染（隔离性能）

## 2. 核心用法 / 方案设计

### 场景 A: 基础表单（useForm + Controller + Zod）

最小可运行的 RHF + Zod 表单：

```tsx
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../utils/zodResolver';

// 1. 定义 Schema
const schema = z.object({
  title: z.string().min(2, '标题至少 2 个字符'),
});
type FormData = z.infer<typeof schema>;

// 2. 初始化 useForm
const { control, handleSubmit } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { title: '' },
});

// 3. 绑定 Controller
<Controller
  control={control}
  name="title"
  render={({ field: { onChange, value }, fieldState: { error } }) => (
    <>
      <TextInput value={value} onChangeText={onChange} />
      {error && <Text>{error.message}</Text>}
    </>
  )}
/>

// 4. 提交
<Pressable onPress={handleSubmit((data) => console.log(data))} />
```

关键点：

- `defaultValues` **必须提供**，否则 Controller 首次渲染时 value 为 undefined
- `handleSubmit` 内部先调用 resolver 校验，通过后才执行回调
- `fieldState.error` 仅在该字段校验失败时有值

### 场景 B: 封装可复用的表单控件

每次写 Controller + TextInput + 错误提示太冗长。封装为 `FormInput` 组件：

```tsx
// src/components/form/FormInput.tsx
export function FormInput<T extends FieldValues>({
  control, name, label, required, icon, ...inputProps
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <FormField label={label} error={error?.message} required={required}>
          <View className="h-12 flex-row items-center rounded-2xl border ...">
            {icon && <Ionicons name={icon} ... />}
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              {...inputProps}
            />
          </View>
        </FormField>
      )}
    />
  );
}
```

使用时只需一行：

```tsx
<FormInput control={control} name="title" label="标题" required icon="create-outline" />
```

`FormField` 是纯展示容器，统一提供标签、必填标记和错误文字：

```tsx
export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center">
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
        {required && <Text className="ml-0.5 text-red-500">*</Text>}
      </View>
      {children}
      {error && <Text className="text-xs text-red-500">{error}</Text>}
    </View>
  );
}
```

### 场景 C: 模态选择器（替代 Web 的 `<select>`）

RN 无原生 `<select>`，通用方案是底部弹出 Modal + FlatList：

```tsx
export function FormSelect({ control, name, label, options }) {
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <>
          {/* 触发器：显示当前选中值 */}
          <Pressable onPress={() => setVisible(true)}>
            <Text>{options.find(o => o.value === value)?.label ?? '请选择'}</Text>
            <Ionicons name="chevron-down" />
          </Pressable>

          {/* 底部弹出选项列表 */}
          <Modal visible={visible} transparent animationType="slide">
            <Pressable className="flex-1 bg-black/40" onPress={() => setVisible(false)} />
            <View className="rounded-t-3xl bg-white">
              <FlatList
                data={options}
                renderItem={({ item }) => (
                  <Pressable onPress={() => { onChange(item.value); setVisible(false); }}>
                    <Text>{item.label}</Text>
                    {item.value === value && <Ionicons name="checkmark" />}
                  </Pressable>
                )}
              />
            </View>
          </Modal>
        </>
      )}
    />
  );
}
```

关键设计：

- `useState(false)` 控制 Modal 显隐 — 这里的 state 属于选择器交互 UI，不是表单数据，不违反"Item 无 state"原则（那是 FlashList Cell 回收场景的约束）
- 半透明遮罩点击关闭，防止用户被锁死在 Modal 中
- 选中项高亮 + 勾选标记，提供明确的视觉反馈

### 场景 D: 标签多选（Chip 模式）

适用于"选择标签"、"选择兴趣"等多选场景：

```tsx
export function FormTagSelect({ control, name, options, maxSelect }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const selected = value ?? [];
        const toggleTag = (tag) => {
          if (selected.includes(tag)) {
            onChange(selected.filter(t => t !== tag));
          } else if (!maxSelect || selected.length < maxSelect) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange([...selected, tag]);
          } else {
            // 达到上限，触觉警告
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        };

        return (
          <View className="flex-row flex-wrap gap-2">
            {options.map(tag => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                className={selected.includes(tag) ? 'bg-indigo-600' : 'bg-white'}
              >
                <Text>{tag}</Text>
              </Pressable>
            ))}
          </View>
        );
      }}
    />
  );
}
```

关键设计：

- `maxSelect` 限制最大选择数，超出时用触觉反馈（Haptics Warning）代替弹窗，体验更轻量
- 选中/未选中通过背景色和文字色切换，无需额外图标

### 场景 E: 焦点跳转（多字段表单 UX）

通过 `returnKeyType` + `onSubmitEditing` + `ref` 实现键盘上"下一项"按钮跳转：

```tsx
const contentRef = useRef<TextInput>(null);

<FormInput
  name="title"
  returnKeyType="next"
  onSubmitEditing={() => contentRef.current?.focus()}
/>

<FormTextArea
  name="content"
  inputRef={contentRef}
/>
```

`FormInput` 通过 `inputRef` prop 接收外部 ref（而非 `forwardRef`），规避了 React 泛型组件 + forwardRef 的类型复杂度。

## 3. 深度原理与机制

### react-hook-form 的渲染优化机制

RHF 的核心优势是**细粒度订阅**。对比传统方案：

```
传统 useState 方案：
用户在"标题"输入 → setTitle → 整个表单组件重渲染 → 所有字段都重新执行 render

react-hook-form 方案：
用户在"标题"输入 → Controller 内部 store 更新 → 只有"标题"的 Controller 重渲染
```

实现原理：

1. `useForm()` 创建一个表单 store（类似 Zustand），存储所有字段的值和错误
2. 每个 `Controller` 只订阅自己 `name` 对应的字段切片
3. 字段值变化时，store 更新 → 只通知订阅了该字段的 Controller → 只有该 Controller 重渲染
4. `handleSubmit` 时一次性读取整个 store，执行 resolver 校验

### Zod v4 校验流程

```
handleSubmit(onSubmit) 被调用
       ↓
RHF 从 store 中读取所有字段值 → { title: '', content: '', ... }
       ↓
调用 resolver(values)
       ↓
zodResolver 内部调用 schema.safeParse(values)
       ↓
┌─ success: true  → return { values: data, errors: {} } → 执行 onSubmit(data)
└─ success: false → 遍历 error.issues，按 path 映射为 FieldErrors → RHF 更新各字段的 error state
```

### 自定义 zodResolver 的实现

官方 `@hookform/resolvers/zod` 与 Zod v4 存在类型兼容问题（ZodError 内部结构变更）。自定义 resolver 只有 15 行：

```typescript
// src/utils/zodResolver.ts
export function zodResolver<T extends z.ZodType>(schema: T): Resolver<z.output<T>> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    // 将 ZodError.issues 数组转换为 { [fieldPath]: { type, message } } 对象
    const fieldErrors = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join('.');
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = { type: issue.code ?? 'validation', message: issue.message };
      }
    }
    return { values: {}, errors: fieldErrors };
  };
}
```

关键点：

- `safeParse` 不抛异常，返回 `{ success, data, error }` 联合类型
- `issue.path` 是数组（如 `['tags']` 或 `['address', 'city']`），用 `.join('.')` 转为 RHF 的点路径
- 同一字段可能有多个 issue，只取第一个（`!fieldErrors[path]` 去重）

### Zod v4 错误消息语法

Zod v4 统一了错误定制方式，v3 的 `message` 参数改为 `error`：

```typescript
// Zod v4 - 字符串简写（仍可用）
z.string().min(2, '标题至少 2 个字符')

// Zod v4 - 对象形式
z.string().min(2, { error: '标题至少 2 个字符' })

// Zod v4 - 函数形式（可访问上下文）
z.string().min(2, { error: (iss) => `至少 ${iss.minimum} 个字符` })
```

## 4. 最佳实践与坑

### ✅ 推荐做法

- **Schema 与 UI 分离**：Zod Schema 放在 `features/xxx/schema.ts`，表单组件从中导入。Schema 可在前后端共享
- **`defaultValues` 必须完整**：每个字段都要有初始值，否则 Controller 首次渲染时 value 为 undefined，RN TextInput 会从非受控切换为受控，触发警告
- **封装可复用的 Form 控件**：`FormInput`、`FormSelect` 等统一处理 Controller + 错误展示 + 样式，页面只需声明式使用
- **TextInput 用 `text-[16px]`**：规避 iOS TextInput lineHeight 渲染 bug（项目规则 rn-platform-pitfalls）
- **`keyboardShouldPersistTaps="handled"`**：ScrollView 内的表单必须设置此项，否则点击按钮时键盘先收起，按钮的 onPress 被吞掉
- **Metro 启用 `unstable_enablePackageExports`**：`react-hook-form` 等现代库通过 `package.json` 的 `exports` 字段声明多平台入口，Metro 默认只读 `main` 字段，Web 端会报 "main module field could not be resolved"。在 `metro.config.js` 中设置 `config.resolver.unstable_enablePackageExports = true` 即可，不影响 iOS/Android

### ❌ 避免做法

- **不要为每个字段手写 `useState`**：状态膨胀、校验分散、性能差。RHF 一个 `control` 管理所有字段
- **不要在 `onChangeText` 中做同步校验**：每次击键都校验会产生抖动的错误提示。RHF 默认在 `onBlur` 和 `onSubmit` 时校验，体验更好
- **不要忘记处理提交中的 loading 状态**：`isSubmitting` 期间禁用按钮 + 显示 ActivityIndicator，防止重复提交
- **不要在 Zod v4 中用 `{ message: '...' }`**：v4 改为 `{ error: '...' }`，但字符串简写 `'...'` 两个版本都支持

### 表单控件选择决策树

```
需要用户输入数据？
├── 单行文本 → FormInput（TextInput）
├── 多行文本 → FormTextArea（TextInput multiline）
├── 从预定义列表选一个 → FormSelect（Modal + FlatList）
├── 从预定义列表选多个 → FormTagSelect（Chip 多选）
├── 日期/时间 → DateTimePicker（Ch14 扩展）
├── 开关/布尔 → Switch（RN 内置）
└── 图片/文件 → ImagePicker（Ch14 扩展）
```

## 5. 行动导向 (Action Guide)

### Step 1: 安装依赖

**这一步在干什么**: 添加 react-hook-form 和 resolver 适配器。`@hookform/resolvers` 虽然 Zod v4 类型有问题，但项目使用自定义 resolver，此包作为类型参考保留。

```bash
npx expo install react-hook-form @hookform/resolvers
```

### Step 2: 创建自定义 zodResolver

**这一步在干什么**: 因为 `@hookform/resolvers/zod` 与 Zod v4 类型不兼容，创建一个轻量的适配器，将 `schema.safeParse()` 的结果映射为 RHF 的 `FieldErrors`。

```typescript
// src/utils/zodResolver.ts
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';

export function zodResolver<T extends z.ZodType>(
  schema: T,
): Resolver<z.output<T>> {
  return async (values: FieldValues) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as z.output<T>, errors: {} as FieldErrors };
    }
    const fieldErrors: Record<string, { type: string; message: string }> = {};
    for (const issue of (result as any).error.issues) {
      const path = issue.path.map(String).join('.');
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = {
          type: issue.code ?? 'validation',
          message: issue.message,
        };
      }
    }
    return { values: {} as z.output<T>, errors: fieldErrors as FieldErrors };
  };
}
```

### Step 3: 构建可复用表单控件

**这一步在干什么**: 创建 `src/components/form/` 目录，封装 5 个通用表单组件。每个组件内置 Controller，对外暴露声明式 API。

**FormField** — 字段容器（标签 + 错误提示）：

```tsx
// src/components/form/FormField.tsx
export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center">
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
        {required && <Text className="ml-0.5 text-red-500">*</Text>}
      </View>
      {children}
      {error && <Text className="text-xs text-red-500">{error}</Text>}
    </View>
  );
}
```

**FormInput** — 单行输入（支持图标、焦点跳转）：

```tsx
// src/components/form/FormInput.tsx
export function FormInput<T extends FieldValues>({
  control, name, label, required, icon, inputRef, ...inputProps
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <FormField label={label} error={error?.message} required={required}>
          <View className="h-12 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
            {icon && <Ionicons name={icon} size={18} color="#9CA3AF" style={{ marginRight: 10 }} />}
            <TextInput
              ref={inputRef}
              className="flex-1 text-[16px] text-gray-900"
              placeholderTextColor="#D1D5DB"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              {...inputProps}
            />
          </View>
        </FormField>
      )}
    />
  );
}
```

**FormTextArea** — 多行输入（带字符计数）：

```tsx
// src/components/form/FormTextArea.tsx — 关键部分
<TextInput
  multiline
  numberOfLines={numberOfLines}
  textAlignVertical="top"
  style={{ minHeight: numberOfLines * 22 }}
  maxLength={maxLength}
/>
{maxLength && (
  <Text className="mt-1.5 text-right text-xs text-gray-400">
    {value?.length ?? 0}/{maxLength}
  </Text>
)}
```

**FormSelect** — 模态选择器（完整代码见 `src/components/form/FormSelect.tsx`）

**FormTagSelect** — 标签多选（完整代码见 `src/components/form/FormTagSelect.tsx`）

### Step 4: 定义表单 Schema 与常量

**这一步在干什么**: 在 `src/features/post/` 目录下创建 Zod Schema，同时导出 TypeScript 类型。选项常量独立文件，方便未来从 API 动态获取。

```typescript
// src/features/post/schema.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(2, '标题至少 2 个字符').max(50, '标题最多 50 个字符'),
  content: z.string().min(10, '内容至少 10 个字符').max(500, '内容最多 500 个字符'),
  category: z.string().min(1, '请选择分类'),
  tags: z.array(z.string()).min(1, '请至少选择一个标签').max(3, '最多选择 3 个标签'),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
```

```typescript
// src/features/post/constants.ts
export const POST_CATEGORIES: SelectOption[] = [
  { label: '前端开发', value: 'frontend' },
  { label: '后端开发', value: 'backend' },
  { label: '移动开发', value: 'mobile' },
  { label: 'DevOps', value: 'devops' },
  { label: '设计', value: 'design' },
  { label: '产品', value: 'product' },
];

export const POST_TAGS = [
  'React Native', 'Expo', '动画', '性能优化', '路由导航',
  '样式', '状态管理', '网络请求', '工具链', '架构设计',
];
```

### Step 5: 创建 Mock API 与 Mutation Hook

**这一步在干什么**: 复用项目已有的 Feature 模块模式（与 auth、feed 一致），创建 Mock API 和 React Query mutation hook。

```typescript
// src/features/post/api.ts
export const postApi = {
  create: async (input: CreatePostInput): Promise<CreatePostResult> => {
    await delay(1500);
    if (input.title.includes('test')) {
      throw new Error('标题已被使用，请换一个');
    }
    return { id: `post-${Date.now()}`, createdAt: new Date().toISOString() };
  },
};

// src/features/post/useCreatePost.ts
export function useCreatePost() {
  return useMutation({
    mutationFn: (data: CreatePostInput) => postApi.create(data),
  });
}
```

### Step 6: 组装表单页面

**这一步在干什么**: 在 `app/demo/create-post.tsx` 创建完整的"发布动态"表单页面，组合所有表单控件。

```tsx
// app/demo/create-post.tsx
export default function CreatePostScreen() {
  const router = useRouter();
  const createPost = useCreatePost();
  const contentRef = useRef<TextInput>(null);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { title: '', content: '', category: '', tags: [] },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createPost.mutateAsync(data);
      Alert.alert('发布成功', '你的动态已发布', [
        { text: '好的', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('发布失败', (error as Error).message);
    }
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <FormInput control={control} name="title" label="标题" required
          icon="create-outline" returnKeyType="next"
          onSubmitEditing={() => contentRef.current?.focus()} />

        <FormTextArea control={control} name="content" label="内容" required
          maxLength={500} inputRef={contentRef} />

        <FormSelect control={control} name="category" label="分类" required
          options={POST_CATEGORIES} />

        <FormTagSelect control={control} name="tags" label="标签" required
          options={POST_TAGS} maxSelect={3} />

        <Pressable onPress={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator /> : <Text>发布</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

### Step 7: 配置路由（Slot → Stack + Route Group）

**这一步在干什么**: 解决两个架构问题——导航模式和路由组织。

#### 7a. Slot 与 Stack 的根本区别

根布局从 `<Slot>` 升级为 `<Stack>`。两者的区别是：

| 特性 | `<Slot />` | `<Stack>` |
|------|-----------|-----------|
| 本质 | 哑渲染器（等价于 Web 的 `<Outlet />`） | 原生栈导航器 |
| 转场动画 | ❌ 无，直接跳切 | ✅ 原生推入/弹出动画 |
| 导航历史 | ❌ 无 | ✅ 维护完整的导航栈 |
| 手势返回 | ❌ 无 | ✅ iOS 右滑、Android 返回键 |
| 适用场景 | 纯布局壳（如 Provider 包裹） | 任何需要页面间导航的场景 |

用 `<Slot />` 时，从 Tabs 导航到表单页面会直接跳切（像网页刷新）；改为 `<Stack>` 后，表单页面以原生推入动画叠加在 Tabs 之上，体验与原生 App 一致。

```tsx
// app/_layout.tsx — AuthGuard 中的变更
// Before: 纯渲染，无导航动画
return <Slot />;

// After: 原生栈导航，有推入动画和手势返回
return (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="(auth)" />
    <Stack.Screen name="(screens)" />
  </Stack>
);
```

#### 7b. 路由组 `(screens)` — 括号文件夹的含义

Expo Router 中，**用括号包裹的文件夹名是"路由组"（Route Group）**：
- **不产生 URL 段** — `app/(screens)/create-post.tsx` 的路由是 `/create-post`，不是 `/screens/create-post`
- **仅提供共享布局** — 文件夹内的 `_layout.tsx` 对所有子页面生效
- **用于逻辑分组** — 把共享同一导航配置的页面放在一起

这样未来新增页面时（如 `media-picker.tsx`、`notification-settings.tsx`），只需在 `(screens)/` 下创建文件，它们自动共享自定义 Header、自动获得独立的路由路径。

#### 7c. Stack.Screen 在不同层级的作用

`<Stack.Screen>` 在**不同层级**有不同含义：

```
根 Stack（app/_layout.tsx）
├── Stack.Screen name="(tabs)"      ← 注册入口：告诉根 Stack "(tabs) 目录存在"
├── Stack.Screen name="(auth)"      ← 注册入口：告诉根 Stack "(auth) 目录存在"
└── Stack.Screen name="(screens)"   ← 注册入口：告诉根 Stack "(screens) 目录存在"
     └── 内部 Stack（(screens)/_layout.tsx）
          └── 无需写 Stack.Screen    ← Expo Router 自动发现目录下所有文件
               └── create-post.tsx 内部的 <Stack.Screen options={{ title: '发布动态' }} />
                                     ← 就地配置：设置自己这个页面的选项
```

- **根布局的 `Stack.Screen name="xxx"`**：声明"存在这样一个路由入口"，不涉及具体页面配置
- **子目录 `_layout.tsx` 的 `<Stack>`**：不写 `Stack.Screen` 时，Expo Router 自动将目录下所有 `.tsx` 文件注册为 Screen
- **页面文件内的 `<Stack.Screen options={...} />`**：就地覆盖当前页面的选项（如 title），无需在 layout 中集中配置

```tsx
// app/(screens)/_layout.tsx — 共享布局，使用自定义 Header
export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options, route }) => (
          <ScreenHeader
            title={typeof options.headerTitle === 'string'
              ? options.headerTitle
              : options.title ?? route.name}
          />
        ),
      }}
    />
  );
}
```

### Step 8: 改造 Explore Tab 为功能演示中心

**这一步在干什么**: 将 Explore Tab 从占位页改造为可扩展的演示入口。每个章节注册一个卡片，有 `route` 的可点击跳转，无 `route` 的显示"即将推出"。

```tsx
// app/(tabs)/explore.tsx
const DEMO_SECTIONS: DemoSection[] = [
  {
    id: 'forms',
    title: '表单体系',
    description: '表单校验、选择器、标签选择、焦点管理',
    icon: 'create-outline',
    tags: ['react-hook-form', 'Zod'],
    route: '/create-post',
  },
  {
    id: 'media',
    title: '图片与媒体',
    description: '图片选择、裁剪压缩、上传进度',
    icon: 'image-outline',
    tags: ['expo-image', 'expo-image-picker'],
    // 无 route → 显示"即将推出"
  },
  // ...更多章节
];
```

未来新增章节时，只需在 `DEMO_SECTIONS` 数组追加条目并创建对应路由，无需修改 Explore 组件逻辑。

---

## 7. 踩坑记录

### iOS 26 Liquid Glass 导航栏按钮

**现象**: 使用 `headerLeft` 或 `unstable_headerLeftItems` 自定义返回按钮时，iOS 26 会在按钮外层强制渲染一个半透明毛玻璃气泡（Liquid Glass），无法通过样式属性移除。

**根因链**:
1. iOS 26 引入 Liquid Glass 设计语言，所有 UIBarButtonItem 自动获得系统级毛玻璃背景
2. `@react-navigation/native-stack` 暴露了 `hidesSharedBackground` TypeScript 类型
3. 但 `react-native-screens@4.16.0`（Expo SDK 54 锁定版本）的原生层**未实现**该接口（实现在 4.17.0 的 PR #2987）
4. 设置 `hidesSharedBackground: true` 被静默忽略

**解决方案**: 使用 `header` prop 提供完全自定义的 React 组件（`ScreenHeader`），彻底替代原生 UINavigationBar。这是生产级 RN 应用的主流做法。

**代价**: 失去原生 Header 推入/弹出动画（Header 随整个页面一起过渡），对绝大多数业务场景可接受。

### FormSelect Modal 遮罩在 iOS 上透明

**现象**: `Modal` 使用 `animationType="slide"` 时，半透明遮罩（`bg-black/40`）从底部随面板一起滑入，导致遮罩出现前下层页面完全可见。

**解决方案**: 将 `animationType` 改为 `"fade"`，遮罩瞬间覆盖全屏；底部面板作为遮罩的子元素渲染。

### Metro Web 端 react-hook-form 模块解析失败

**现象**: Web 端报 "main module field could not be resolved"。

**根因**: `react-hook-form` 通过 `package.json` 的 `exports` 字段声明多平台入口，Metro 默认只读 `main` 字段。

**解决方案**: 在 `metro.config.js` 中启用 `config.resolver.unstable_enablePackageExports = true`，三端统一走 `exports` 解析。
