import * as ts from 'typescript';
import * as path from 'path';

// 测试符号的层次结构
function testSymbolHierarchy() {
  const typesFile = path.resolve(__dirname, '../src/utils/types.ts');
  const fooFile = path.resolve(__dirname, '../src/utils/foo.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([typesFile, fooFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 符号层次结构分析：\n');

  // 1. 分析 types.ts 中的原始符号
  const typesSourceFile = program.getSourceFile(typesFile);
  if (typesSourceFile) {
    console.log('📁 types.ts 中的原始符号:');
    
    function visitTypesNode(node: ts.Node) {
      if (ts.isTypeAliasDeclaration(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node.name);
        if (symbol) {
          console.log(`   ${node.name.text}:`);
          console.log(`     标志: ${symbol.flags}`);
          console.log(`     类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
          console.log(`     声明: ${node.getText()}`);
        }
      }
      ts.forEachChild(node, visitTypesNode);
    }
    
    visitTypesNode(typesSourceFile);
  }

  console.log('');

  // 2. 分析 foo.ts 中的重新导出符号
  const fooSourceFile = program.getSourceFile(fooFile);
  if (fooSourceFile) {
    console.log('📁 foo.ts 中的重新导出符号:');
    
    function visitFooNode(node: ts.Node) {
      if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          const importPath = node.moduleSpecifier.text;
          console.log(`   从 '${importPath}' 重新导出:`);
          
          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            node.exportClause.elements.forEach(element => {
              const symbol = typeChecker.getSymbolAtLocation(element.name);
              if (symbol) {
                console.log(`     ${element.name.text}:`);
                console.log(`       标志: ${symbol.flags}`);
                console.log(`       类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
                
                // 检查是否是别名
                if (symbol.flags & ts.SymbolFlags.Alias) {
                  console.log(`       🔗 这是一个别名符号`);
                  const aliasedSymbol = typeChecker.getAliasedSymbol(symbol);
                  if (aliasedSymbol) {
                    console.log(`       原始符号标志: ${aliasedSymbol.flags}`);
                    console.log(`       原始符号类型: ${ts.SymbolFlags[aliasedSymbol.flags] || 'Unknown'}`);
                    console.log(`       原始符号名称: ${aliasedSymbol.escapedName}`);
                  }
                }
              }
            });
          }
        }
      }
      ts.forEachChild(node, visitFooNode);
    }
    
    visitFooNode(fooSourceFile);
  }
}

// 运行测试
testSymbolHierarchy();
