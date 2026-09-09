import { type ClassValue, clsx } from 'clsx'

/**
 * Склеивает классы. Раньше поверх clsx работал twMerge, но Tailwind в проекте
 * не подключён (стили — CSS Modules), поэтому разрешать конфликты
 * tailwind-утилит было не над чем.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
