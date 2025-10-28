import * as ts from 'typescript';
import * as path from 'path';

// 测试导入 Foo2Props 的识别流程
function testFoo2PropsImportFlow() {
  const indexFile = path.resolve(__dirname, '../src/index.ts');
  const fooFile = path.resolve(__dirname, '../src/utils/foo.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([indexFile, fooFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 导入 Foo2Props 的识别流程分析：\n');

  // 1. 分析 index.ts 中的导入语句
  const indexSourceFile = program.getSourceFile(indexFile);
  if (indexSourceFile) {
    console.log('📁 index.ts 中的导入语句:');
    
    function visitIndexNode(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          console.log(`   import {...} from '${importPath}':`);
          
          // 检查是否是显式类型导入
          const isTypeOnlyImport = node.importClause?.isTypeOnly;
          const hasTypeOnlySpecifiers = node.importClause?.namedBindings && 
            ts.isNamedImports(node.importClause.namedBindings) &&
            node.importClause.namedBindings.elements.some(element => element.isTypeOnly);
          
          console.log(`     isTypeOnlyImport: ${isTypeOnlyImport}`);
          console.log(`     hasTypeOnlySpecifiers: ${hasTypeOnlySpecifiers}`);
          
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            console.log(`     导入的项目:`);
            
            node.importClause.namedBindings.elements.forEach(element => {
              console.log(`       - ${element.name.text}:`);
              console.log(`         isTypeOnly: ${element.isTypeOnly}`);
              
              // 获取符号信息
              const symbol = typeChecker.getSymbolAtLocation(element.name);
              if (symbol) {
                console.log(`         符号标志: ${symbol.flags}`);
                console.log(`         符号类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
                
                // 检查是否是别名
                if (symbol.flags & ts.SymbolFlags.Alias) {
                  console.log(`         🔗 这是一个别名符号`);
                  const aliasedSymbol = typeChecker.getAliasedSymbol(symbol);
                  if (aliasedSymbol) {
                    console.log(`         原始符号标志: ${aliasedSymbol.flags}`);
                    console.log(`         原始符号类型: ${ts.SymbolFlags[aliasedSymbol.flags] || 'Unknown'}`);
                    console.log(`         原始符号名称: ${aliasedSymbol.escapedName}`);
                  }
                }
                
                // 检查符号的声明
                if (symbol.declarations && symbol.declarations.length > 0) {
                  const declaration = symbol.declarations[0];
                  console.log(`         声明类型: ${ts.SyntaxKind[declaration.kind]}`);
                  console.log(`         声明位置: ${declaration.getSourceFile().fileName}`);
                }
              }
              
              console.log(''); // 空行分隔
            });
          }
        }
      }
      ts.forEachChild(node, visitIndexNode);
    }
    
    visitIndexNode(indexSourceFile);
  }

  console.log('');

  // 2. 分析 foo.ts 中的导出语句
  const fooSourceFile = program.getSourceFile(fooFile);
  if (fooSourceFile) {
    console.log('📁 foo.ts 中的导出语句:');
    
    function visitFooNode(node: ts.Node) {
      if (ts.isInterfaceDeclaration(node) && node.name.text === 'Foo2Props') {
        console.log(`   ${node.name.text}:`);
        console.log(`     声明类型: ${ts.SyntaxKind[node.kind]}`);
        console.log(`     声明内容: ${node.getText()}`);
        
        // 获取符号信息
        const symbol = typeChecker.getSymbolAtLocation(node.name);
        if (symbol) {
          console.log(`     符号标志: ${symbol.flags}`);
          console.log(`     符号类型: ${ts.SymbolFlags[symbol.flags] || 'Unknown'}`);
        }
      }
      ts.forEachChild(node, visitFooNode);
    }
    
    visitFooNode(fooSourceFile);
  }
}

// 运行测试
testFoo2PropsImportFlow();
