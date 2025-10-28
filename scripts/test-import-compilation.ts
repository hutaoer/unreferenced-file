import * as ts from 'typescript';

// 测试不同导入类型的编译结果
function testImportCompilation() {
  const testCode = `
// 值导入
import { demoData } from "./address";

// 类型导入
import { type TAddressKey } from "./address";

// 混合导入
import { demoData1, type IAddressProps } from "./address";

// 默认导入
import demoData2 from "./address";

// 命名空间导入
import * as Address from "./address";

// 类型命名空间导入
import type * as AddressTypes from "./address";

console.log('测试代码');
`;

  console.log('🔍 不同导入类型的编译结果分析：\n');

  // 创建 TypeScript 程序
  const result = ts.transpile(testCode, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  console.log('📝 编译后的 JavaScript 代码:');
  console.log(result);
  console.log('');

  // 分析 AST
  const sourceFile = ts.createSourceFile('test.ts', testCode, ts.ScriptTarget.ES2020, true);
  
  console.log('📊 AST 分析:');
  function visitNode(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        console.log(`\n导入语句: import {...} from '${moduleSpecifier.text}'`);
        
        if (node.importClause) {
          // 检查默认导入
          if (node.importClause.name) {
            console.log(`  默认导入: ${node.importClause.name.text}`);
          }
          
          // 检查命名导入
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              console.log(`  命名导入:`);
              node.importClause.namedBindings.elements.forEach(element => {
                console.log(`    - ${element.name.text} (${element.isTypeOnly ? 'type-only' : 'value'})`);
              });
            } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              console.log(`  命名空间导入: ${node.importClause.namedBindings.name.text}`);
            }
          }
          
          // 检查是否为类型导入
          console.log(`  是否为类型导入: ${node.importClause.isTypeOnly ? '是' : '否'}`);
        }
      }
    }
    ts.forEachChild(node, visitNode);
  }
  
  visitNode(sourceFile);
}

// 运行测试
testImportCompilation();
