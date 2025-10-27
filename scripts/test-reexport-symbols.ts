import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// 测试重新导出符号的标志
function testReExportSymbolFlags() {
  const testFile = path.resolve(__dirname, '../src/utils/foo.ts');
  
  if (!fs.existsSync(testFile)) {
    console.log('测试文件不存在');
    return;
  }

  // 创建 TypeScript 程序
  const program = ts.createProgram([testFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const sourceFile = program.getSourceFile(testFile);
  if (!sourceFile) {
    console.log('无法读取源文件');
    return;
  }

  console.log('🔍 分析重新导出符号标志：\n');

  // 遍历 AST 节点
  function visitNode(node: ts.Node) {
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const importPath = node.moduleSpecifier.text;
        
        console.log(`📦 重新导出语句: export {...} from '${importPath}'`);
        
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          console.log(`   导出的项目:`);
          
          node.exportClause.elements.forEach(element => {
            console.log(`     - ${element.name.text}`);
            
            // 获取符号信息
            const typeChecker = program.getTypeChecker();
            const symbol = typeChecker.getSymbolAtLocation(element.name);
            
            if (symbol) {
              console.log(`       符号标志: ${symbol.flags}`);
              console.log(`       SymbolFlags.Type: ${symbol.flags & ts.SymbolFlags.Type}`);
              console.log(`       SymbolFlags.TypeAlias: ${symbol.flags & ts.SymbolFlags.TypeAlias}`);
              console.log(`       SymbolFlags.Interface: ${symbol.flags & ts.SymbolFlags.Interface}`);
              console.log(`       SymbolFlags.TypeParameter: ${symbol.flags & ts.SymbolFlags.TypeParameter}`);
              console.log(`       SymbolFlags.Alias: ${symbol.flags & ts.SymbolFlags.Alias}`);
              console.log(`       SymbolFlags.Value: ${symbol.flags & ts.SymbolFlags.Value}`);
              
              // 检查是否是别名符号
              if (symbol.flags & ts.SymbolFlags.Alias) {
                console.log(`       🔗 这是一个别名符号`);
                const aliasedSymbol = typeChecker.getAliasedSymbol(symbol);
                if (aliasedSymbol) {
                  console.log(`       原始符号标志: ${aliasedSymbol.flags}`);
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

// 运行测试
testReExportSymbolFlags();
