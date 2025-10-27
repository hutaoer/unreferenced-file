
import { greet } from './utils/greeting';
import { Button } from './components/Button';
// import { NewFeatureConfig } from './experimental/newFeature';
import {type pStatus} from './utils/foo';
// import {pStatus, Foo, Foo2Props} from './utils/foo';

// 主程序入口
function main(): void {
  console.log('🚀 TypeScript Demo Project Started!');
  // const status: pStatus = { id: '1', name: 'foo' };
  // const foo: Foo = { id: '1', name: 'foo' };
  // const foo: Foo = createFoo('1', 'foo');
  // console.log(foo);
  // const foo2: Foo2Props = { id: '1', name: 'foo' };
  // console.log(foo2);
  // 使用工具函数
  const message = greet('TypeScript');
  console.log(message);
  
  // 演示类型安全
  const numbers: number[] = [1, 2, 3, 4, 5];
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  console.log(`数组求和: [${numbers.join(', ')}] = ${sum}`);
}

// 运行主程序
main();
