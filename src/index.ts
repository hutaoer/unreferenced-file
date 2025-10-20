
import { greet } from './utils/greeting';
import { Calculator } from './utils/calculator';
import { Button } from './components/Button';
import { NewFeatureConfig } from './experimental/newFeature';
import {type Foo, createFoo} from './utils/foo';

// 主程序入口
function main(): void {
  console.log('🚀 TypeScript Demo Project Started!');
  // const foo: Foo = { id: '1', name: 'foo' };
  const foo: Foo = createFoo('1', 'foo');
  console.log(foo);
  // 使用工具函数
  const message = greet('TypeScript');
  console.log(message);
  
  // 使用计算器类
  const calc = new Calculator();
  const result = calc.add(10, 20);
  console.log(`计算结果: 10 + 20 = ${result}`);
  
  // 使用按钮组件
  const button = new Button({
    text: 'Click me',
    onClick: () => console.log('Button clicked!')
  });
  console.log('Button rendered:', button.render());
  
  // 演示类型安全
  const numbers: number[] = [1, 2, 3, 4, 5];
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  console.log(`数组求和: [${numbers.join(', ')}] = ${sum}`);
}

// 运行主程序
main();
