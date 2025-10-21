# 问题

## v2版本

### type, props 都不使用
```ts
import {type Foo, Foo2Props} from './utils/foo';

``` 
- 判断为未引用

### type Foo 使用
```ts
import {type Foo, Foo2Props} from './utils/foo';
const foo: Foo = {name:'1',id:3}

``` 
- 判断为未引用


### Foo2Props 使用
```ts
import {type Foo, Foo2Props} from './utils/foo';
const foo: Foo = {name:'1',id:3}

``` 
- 判断为引用


## 初版

### type, props 都不使用
```ts
import {type Foo, Foo2Props} from './utils/foo';

``` 
- 判断为引用

### type Foo 使用
```ts
import {type Foo, Foo2Props} from './utils/foo';
const foo: Foo = {name:'1',id:3}

``` 
- 判断为引用


### Foo2Props 使用
```ts
import {type Foo, Foo2Props} from './utils/foo';
const foo: Foo = {name:'1',id:3}

``` 
- 判断为引用