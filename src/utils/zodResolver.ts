import type { FieldValues, Resolver, ResolverResult } from 'react-hook-form';
import type { z } from 'zod';

/**
 * 适配 Zod v4 的 react-hook-form Resolver。
 * 官方 @hookform/resolvers 与 Zod v4 存在类型兼容问题，
 * 此自定义 resolver 直接调用 safeParse，将 ZodError.issues 映射为 FieldErrors。
 */
export function zodResolver<T extends z.ZodType<FieldValues>>(
  schema: T,
): Resolver<z.output<T>> {
  const resolver: Resolver<z.output<T>> = async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data, errors: {} } as ResolverResult<
        z.output<T>
      >;
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

    return { values: {}, errors: fieldErrors } as ResolverResult<
      z.output<T>
    >;
  };
  return resolver;
}
