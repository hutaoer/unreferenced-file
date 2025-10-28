import * as ts from 'typescript';
import * as path from 'path';

// 测试递归的必要性
function testRecursionNecessity() {
  const testFile = path.resolve(__dirname, '../src/index.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([testFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 测试递归的必要性：\n');

  const sourceFile = program.getSourceFile(testFile);
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
                console.log(`     符号标志: ${symbol.flags}`);
                console.log(`     符号类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
                
                // 模拟递归过程
                let currentSymbol = symbol;
                let depth = 0;
                const maxDepth = 10; // 防止无限递归
                
                while (currentSymbol && depth < maxDepth) {
                  if (currentSymbol.flags & ts.SymbolFlags.Alias) {
                    console.log(`     🔗 第${depth + 1}层: Alias 符号`);
                    const aliasedSymbol = typeChecker.getAliasedSymbol(currentSymbol);
                    if (aliasedSymbol) {
                      console.log(`       原始符号标志: ${aliasedSymbol.flags}`);
                      console.log(`       原始符号类型: ${ts.SymbolFlags[aliasedSymbol.flags] || 'Unknown'}`);
                      currentSymbol = aliasedSymbol;
                      depth++;
                    } else {
                      break;
                    }
                  } else {
                    console.log(`     ✅ 第${depth + 1}层: 找到最终符号类型: ${ts.SymbolFlags[currentSymbol.flags] || 'Unknown'}`);
                    break;
                  }
                }
                
                if (depth >= maxDepth) {
                  console.log(`     ⚠️  达到最大递归深度: ${maxDepth}`);
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
testRecursionNecessity();
