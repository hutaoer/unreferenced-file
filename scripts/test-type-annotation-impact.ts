import * as ts from 'typescript';
import * as path from 'path';

// 测试类型注解对文件识别的影响
function testTypeAnnotationImpact() {
  const addressFile = path.resolve(__dirname, '../src/address.ts');
  const indexFile = path.resolve(__dirname, '../src/index.ts');
  
  // 创建 TypeScript 程序
  const program = ts.createProgram([addressFile, indexFile], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  });

  const typeChecker = program.getTypeChecker();
  
  console.log('🔍 类型注解对文件识别的影响分析：\n');

  // 1. 分析 address.ts 中的类型使用
  const addressSourceFile = program.getSourceFile(addressFile);
  if (addressSourceFile) {
    console.log('📁 address.ts 中的类型使用情况:');
    
    function visitAddressNode(node: ts.Node) {
      // 检查变量声明中的类型注解
      if (ts.isVariableDeclaration(node)) {
        if (node.type) {
          console.log(`   ${node.name.getText()} 使用了类型注解: ${node.type.getText()}`);
          
          // 获取类型注解的符号
          const typeSymbol = typeChecker.getSymbolAtLocation(node.type);
          if (typeSymbol) {
            console.log(`     类型符号标志: ${typeSymbol.flags}`);
            console.log(`     类型符号类型: ${ts.SymbolFlags[typeSymbol.flags] || 'Unknown'}`);
            
            // 检查是否是别名
            if (typeSymbol.flags & ts.SymbolFlags.Alias) {
              const aliasedSymbol = typeChecker.getAliasedSymbol(typeSymbol);
              if (aliasedSymbol) {
                console.log(`     原始类型符号标志: ${aliasedSymbol.flags}`);
                console.log(`     原始类型符号类型: ${ts.SymbolFlags[aliasedSymbol.flags] || 'Unknown'}`);
              }
            }
          }
        }
      }
      
      ts.forEachChild(node, visitAddressNode);
    }
    
    visitAddressNode(addressSourceFile);
  }

  console.log('');

  // 2. 分析 index.ts 中的导入
  const indexSourceFile = program.getSourceFile(indexFile);
  if (indexSourceFile) {
    console.log('📁 index.ts 中的导入情况:');
    
    function visitIndexNode(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          console.log(`   从 '${moduleSpecifier.text}' 导入:`);
          
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              console.log(`     - ${element.name.text}`);
            });
          }
        }
      }
      ts.forEachChild(node, visitIndexNode);
    }
    
    visitIndexNode(indexSourceFile);
  }

  console.log('\n🎯 分析结论:');
  console.log('1. demoData 使用了 IAddressProps 类型注解');
  console.log('2. 但 IAddressProps 本身没有被导入');
  console.log('3. 这种情况下，IAddressProps 是否会被识别为"使用中"？');
}

// 运行测试
testTypeAnnotationImpact();
