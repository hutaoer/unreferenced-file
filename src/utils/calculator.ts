/**
 * 计算器类
 */

export class Calculator {
  /**
   * 加法运算
   * @param a 第一个数
   * @param b 第二个数
   * @returns 两数之和
   */
  add(a: number, b: number): number {
    return a + b;
  }

  /**
   * 减法运算
   * @param a 被减数
   * @param b 减数
   * @returns 两数之差
   */
  subtract(a: number, b: number): number {
    return a - b;
  }

  /**
   * 乘法运算
   * @param a 第一个数
   * @param b 第二个数
   * @returns 两数之积
   */
  multiply(a: number, b: number): number {
    return a * b;
  }

  /**
   * 除法运算
   * @param a 被除数
   * @param b 除数
   * @returns 两数之商
   */
  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return a / b;
  }
}
