import * as ts from 'typescript';
import * as path from 'path';

// 测试不同引用类型的 flags 值
function testDifferentReferenceFlags() {
  const addressFile = path.resolve(__dirname, '../src/address.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([addressFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 不同引用类型的 flags 值分析：\n');

  const sourceFile = program.getSourceFile(addressFile);
  if (sourceFile) {
    console.log('📁 address.ts 中的导出符号:');
    
    function visitNode(node: ts.Node) {
      // 检查接口声明
      if (ts.isInterfaceDeclaration(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node.name);
        if (symbol) {
          console.log(`   ${node.name.text} (接口):`);
          console.log(`     标志: ${symbol.flags}`);
          console.log(`     类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
          console.log(`     声明: ${node.getText()}`);
        }
      }
      
      // 检查类型别名
      if (ts.isTypeAliasDeclaration(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node.name);
        if (symbol) {
          console.log(`   ${node.name.text} (类型别名):`);
          console.log(`     标志: ${symbol.flags}`);
          console.log(`     类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
          console.log(`     声明: ${node.getText()}`);
        }
      }
      
      // 检查常量声明
      if (ts.isVariableStatement(node)) {
        const declarationList = node.declarationList;
        if (declarationList.declarations.length > 0) {
          const declaration = declarationList.declarations[0];
          if (ts.isIdentifier(declaration.name)) {
            const symbol = typeChecker.getSymbolAtLocation(declaration.name);
            if (symbol) {
              console.log(`   ${declaration.name.text} (常量):`);
              console.log(`     标志: ${symbol.flags}`);
              console.log(`     类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
              console.log(`     声明: ${node.getText()}`);
            }
          }
        }
      }
      
      ts.forEachChild(node, visitNode);
    }
    
    visitNode(sourceFile);
  }

  console.log('\n📊 SymbolFlags 常量值:');
  console.log('Type:', ts.SymbolFlags.Type);
  console.log('TypeAlias:', ts.SymbolFlags.TypeAlias);
  console.log('Interface:', ts.SymbolFlags.Interface);
  console.log('TypeParameter:', ts.SymbolFlags.TypeParameter);
  console.log('Alias:', ts.SymbolFlags.Alias);
  console.log('Value:', ts.SymbolFlags.Value);
  console.log('Variable:', ts.SymbolFlags.Variable);
  console.log('Function:', ts.SymbolFlags.Function);
  console.log('Class:', ts.SymbolFlags.Class);
  console.log('Enum:', ts.SymbolFlags.Enum);
}

// 运行测试
testDifferentReferenceFlags();
