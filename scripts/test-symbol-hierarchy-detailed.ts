import * as ts from 'typescript';
import * as path from 'path';

// 测试符号层次结构
function testSymbolHierarchy() {
  const addressFile = path.resolve(__dirname, '../src/address.ts');
  const indexFile = path.resolve(__dirname, '../src/index.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([addressFile, indexFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 符号层次结构详细分析：\n');

  // 1. 分析 address.ts 中的原始接口符号
  const addressSourceFile = program.getSourceFile(addressFile);
  if (addressSourceFile) {
    console.log('📁 address.ts 中的原始接口符号:');
    
    function visitAddressNode(node: ts.Node) {
      if (ts.isInterfaceDeclaration(node) && node.name.text === 'IAddressProps') {
        const symbol = typeChecker.getSymbolAtLocation(node.name);
        if (symbol) {
          console.log(`   ${node.name.text}:`);
          console.log(`     标志: ${symbol.flags}`);
          console.log(`     类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
          console.log(`     声明: ${node.getText()}`);
          console.log(`     声明类型: ${ts.SyntaxKind[node.kind]}`);
        }
      }
      ts.forEachChild(node, visitAddressNode);
    }
    
    visitAddressNode(addressSourceFile);
  }

  console.log('');

  // 2. 分析 index.ts 中的导入符号
  const indexSourceFile = program.getSourceFile(indexFile);
  if (indexSourceFile) {
    console.log('📁 index.ts 中的导入符号:');
    
    function visitIndexNode(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === './address') {
          console.log(`   从 './address' 导入:`);
          
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              if (element.name.text === 'IAddressProps') {
                console.log(`     ${element.name.text}:`);
                
                // 获取导入符号
                const importSymbol = typeChecker.getSymbolAtLocation(element.name);
                if (importSymbol) {
                  console.log(`       导入符号标志: ${importSymbol.flags}`);
                  console.log(`       导入符号类型: ${ts.SymbolFlags[importSymbol.flags] || 'Unknown'}`);
                  
                  // 检查是否是别名
                  if (importSymbol.flags & ts.SymbolFlags.Alias) {
                    console.log(`       🔗 这是一个别名符号`);
                    const aliasedSymbol = typeChecker.getAliasedSymbol(importSymbol);
                    if (aliasedSymbol) {
                      console.log(`       原始符号标志: ${aliasedSymbol.flags}`);
                      console.log(`       原始符号类型: ${ts.SymbolFlags[aliasedSymbol.flags] || 'Unknown'}`);
                      console.log(`       原始符号名称: ${aliasedSymbol.escapedName}`);
                      console.log(`       原始符号声明: ${aliasedSymbol.declarations?.[0]?.getText()}`);
                    }
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
}

// 运行测试
testSymbolHierarchy();
