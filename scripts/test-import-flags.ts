import * as ts from 'typescript';
import * as path from 'path';

// 测试导入时的 flags 值
function testImportFlags() {
  const indexFile = path.resolve(__dirname, '../src/index.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([indexFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 导入时的 flags 值分析：\n');

  const sourceFile = program.getSourceFile(indexFile);
  if (sourceFile) {
    function visitNode(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          console.log(`📦 导入语句: import {...} from '${moduleSpecifier.text}'`);
          
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              console.log(`   - ${element.name.text}:`);
              
              const symbol = typeChecker.getSymbolAtLocation(element.name);
              if (symbol) {
                console.log(`     导入符号标志: ${symbol.flags}`);
                console.log(`     导入符号类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
                
                // 检查是否是别名
                if (symbol.flags & ts.SymbolFlags.Alias) {
                  console.log(`     🔗 这是一个别名符号`);
                  const aliasedSymbol = typeChecker.getAliasedSymbol(symbol);
                  if (aliasedSymbol) {
                    console.log(`       原始符号标志: ${aliasedSymbol.flags}`);
                    console.log(`       原始符号类型: ${ts.SymbolFlags[aliasedSymbol.flags] || 'Unknown'}`);
                    console.log(`       原始符号名称: ${aliasedSymbol.escapedName}`);
                  }
                }
              }
              
              console.log(''); // 空行分隔
            });
          }
        }
      }
      ts.forEachChild(node, visitNode);
    }
    
    visitNode(sourceFile);
  }
}

// 运行测试
testImportFlags();
