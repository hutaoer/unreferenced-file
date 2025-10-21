// 导出一个类型和一个值
export type Foo = {
  id: string;
  name: string;
};

export interface Foo2Props {
  id: string;
  name: string;
}

export function createFoo(id: string, name: string): Foo {
  return { id, name };
}