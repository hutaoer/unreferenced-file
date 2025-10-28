import * as ts from 'typescript';
import * as path from 'path';

// 测试 type 导入的运行时行为
function testTypeImportRuntimeBehavior() {
  const addressFile = path.resolve(__dirname, '../src/address.ts');
  const indexFile = path.resolve(__dirname, '../src/index.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([addressFile, indexFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 type 导入的运行时行为分析：\n');

  // 1. 分析 address.ts 中的导出
  const addressSourceFile = program.getSourceFile(addressFile);
  if (addressSourceFile) {
    console.log('📁 address.ts 中的导出:');
    
    function visitAddressNode(node: ts.Node) {
      if (ts.isTypeAliasDeclaration(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node.name);
        if (symbol) {
          console.log(`   ${node.name.text} (类型别名):`);
          console.log(`     符号标志: ${symbol.flags}`);
          console.log(`     符号类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
          console.log(`     声明: ${node.getText()}`);
        }
      }
      
      ts.forEachChild(node, visitAddressNode);
    }
    
    visitAddressNode(addressSourceFile);
  }

  console.log('');

  // 2. 分析 index.ts 中的 type 导入
  const indexSourceFile = program.getSourceFile(indexFile);
  if (indexSourceFile) {
    console.log('📁 index.ts 中的 type 导入:');
    
    function visitIndexNode(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          console.log(`   从 '${moduleSpecifier.text}' 导入:`);
          
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              console.log(`     - ${element.name.text}:`);
              console.log(`       导入类型: ${element.isTypeOnly ? 'type-only' : 'value'}`);
              console.log(`       导入语法: ${element.getText()}`);
              
              // 获取符号信息
              const symbol = typeChecker.getSymbolAtLocation(element.name);
              if (symbol) {
                console.log(`       符号标志: ${symbol.flags}`);
                console.log(`       符号类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
                
                // 检查是否是别名
                if (symbol.flags & ts.SymbolFlags.Alias) {
                  const aliasedSymbol = typeChecker.getAliasedSymbol(symbol);
                  if (aliasedSymbol) {
                    console.log(`       原始符号标志: ${aliasedSymbol.flags}`);
                    console.log(`       原始符号类型: ${ts.SymbolFlags[aliasedSymbol.flags] || 'Unknown'}`);
                  }
                }
              }
            });
          }
        }
      }
      ts.forEachChild(node, visitIndexNode);
    }
    
    visitIndexNode(indexSourceFile);
  }

  console.log('\n🎯 分析结论:');
  console.log('1. import { type TAddressKey } 是类型导入');
  console.log('2. 这种导入在运行时会被完全移除');
  console.log('3. webpack 不会处理这种导入语句');
}

// 运行测试
testTypeImportRuntimeBehavior();
