import * as ts from 'typescript';

// 判断导入是否为运行时导入的详细标准
function analyzeImportType(node: ts.ImportDeclaration): {
  isRuntimeImport: boolean;
  reason: string;
  details: any;
} {
  const result = {
    isRuntimeImport: false,
    reason: '',
    details: {}
  };

  if (!node.importClause) {
    result.reason = '没有 importClause，可能是 side-effect import';
    result.isRuntimeImport = true;
    return result;
  }

  // 1. 检查整个导入是否为类型导入
  if (node.importClause.isTypeOnly) {
    result.reason = '整个导入语句是类型导入 (import type)';
    result.isRuntimeImport = false;
    result.details = { isTypeOnly: true };
    return result;
  }

  // 2. 检查默认导入
  if (node.importClause.name) {
    result.reason = '包含默认导入，是运行时导入';
    result.isRuntimeImport = true;
    result.details = { hasDefaultImport: true };
    return result;
  }

  // 3. 检查命名导入
  if (node.importClause.namedBindings) {
    if (ts.isNamedImports(node.importClause.namedBindings)) {
      const elements = node.importClause.namedBindings.elements;
      const hasValueImports = elements.some(el => !el.isTypeOnly);
      const hasTypeImports = elements.some(el => el.isTypeOnly);
      
      if (hasValueImports) {
        result.reason = '包含值导入，是运行时导入';
        result.isRuntimeImport = true;
        result.details = { 
          hasValueImports: true,
          valueImports: elements.filter(el => !el.isTypeOnly).map(el => el.name.text),
          typeImports: elements.filter(el => el.isTypeOnly).map(el => el.name.text)
        };
      } else if (hasTypeImports) {
        result.reason = '只包含类型导入，不是运行时导入';
        result.isRuntimeImport = false;
        result.details = { 
          hasTypeImports: true,
          typeImports: elements.map(el => el.name.text)
        };
      }
    } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
      result.reason = '包含命名空间导入，是运行时导入';
      result.isRuntimeImport = true;
      result.details = { 
        hasNamespaceImport: true,
        namespaceName: node.importClause.namedBindings.name.text
      };
    }
  }

  return result;
}

// 测试函数
function testImportAnalysis() {
  const testCases = [
    'import { demoData } from "./address";',
    'import { type TAddressKey } from "./address";',
    'import { demoData1, type IAddressProps } from "./address";',
    'import type { TAddressKey } from "./address";',
    'import * as Address from "./address";',
    'import type * as AddressTypes from "./address";',
    'import "./address";'
  ];

  console.log('🔍 导入类型判断标准：\n');

  testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: ${testCase}`);
    
    const sourceFile = ts.createSourceFile('test.ts', testCase, ts.ScriptTarget.ES2020, true);
    const importNode = sourceFile.statements[0] as ts.ImportDeclaration;
    
    const analysis = analyzeImportType(importNode);
    
    console.log(`  结果: ${analysis.isRuntimeImport ? '✅ 运行时导入' : '❌ 非运行时导入'}`);
    console.log(`  原因: ${analysis.reason}`);
    console.log(`  详情: ${JSON.stringify(analysis.details, null, 2)}`);
    console.log('');
  });
}

// 运行测试
testImportAnalysis();
