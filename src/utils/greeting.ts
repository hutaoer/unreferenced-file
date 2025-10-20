/**
 * 问候语工具函数
 */

/**
 * 生成问候语
 * @param name 姓名
 * @returns 问候语字符串
 */
export function greet(name: string): string {
  return `Hello, ${name}! Welcome to TypeScript!`;
}

/**
 * 生成告别语
 * @param name 姓名
 * @returns 告别语字符串
 */
export function farewell(name: string): string {
  return `Goodbye, ${name}! See you next time!`;
}
