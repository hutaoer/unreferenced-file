import * as ts from 'typescript';
import * as path from 'path';

// 测试 demoData vs demoData1 的符号差异
function testDemoDataDifference() {
  const addressFile = path.resolve(__dirname, '../src/address.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([addressFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 demoData vs demoData1 的符号差异分析：\n');

  const sourceFile = program.getSourceFile(addressFile);
  if (sourceFile) {
    function visitNode(node: ts.Node) {
      // 检查变量声明
      if (ts.isVariableStatement(node)) {
        const declarationList = node.declarationList;
        if (declarationList.declarations.length > 0) {
          const declaration = declarationList.declarations[0];
          if (ts.isIdentifier(declaration.name)) {
            const name = declaration.name.text;
            if (name === 'demoData' || name === 'demoData1') {
              console.log(`📦 ${name}:`);
              console.log(`   声明: ${node.getText()}`);
              
              // 获取符号信息
              const symbol = typeChecker.getSymbolAtLocation(declaration.name);
              if (symbol) {
                console.log(`   符号标志: ${symbol.flags}`);
                console.log(`   符号类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
                
                // 获取类型信息
                const type = typeChecker.getTypeAtLocation(declaration);
                if (type) {
                  console.log(`   类型标志: ${type.flags}`);
                  console.log(`   类型类型: ${ts.TypeFlags[type.flags] || 'Unknown'}`);
                  
                  // 检查类型符号
                  const typeSymbol = type.symbol;
                  if (typeSymbol) {
                    console.log(`   类型符号标志: ${typeSymbol.flags}`);
                    console.log(`   类型符号类型: ${ts.SymbolFlags[typeSymbol.flags] || 'Unknown'}`);
                    console.log(`   类型符号名称: ${typeSymbol.escapedName}`);
                  }
                }
              }
              
              console.log(''); // 空行分隔
            }
          }
        }
      }
      
      ts.forEachChild(node, visitNode);
    }
    
    visitNode(sourceFile);
  }
}

// 运行测试
testDemoDataDifference();
