import * as ts from 'typescript';

// 检查 524288 对应的符号标志
const flags = 524288;
console.log('原始符号标志分析:');
console.log(`SymbolFlags.Type: ${flags & ts.SymbolFlags.Type}`);
console.log(`SymbolFlags.TypeAlias: ${flags & ts.SymbolFlags.TypeAlias}`);
console.log(`SymbolFlags.Interface: ${flags & ts.SymbolFlags.Interface}`);
console.log(`SymbolFlags.TypeParameter: ${flags & ts.SymbolFlags.TypeParameter}`);
console.log(`SymbolFlags.Alias: ${flags & ts.SymbolFlags.Alias}`);
console.log(`SymbolFlags.Value: ${flags & ts.SymbolFlags.Value}`);

// 检查所有可能的标志
console.log('\n所有符号标志:');
console.log('Type:', ts.SymbolFlags.Type);
console.log('TypeAlias:', ts.SymbolFlags.TypeAlias);
console.log('Interface:', ts.SymbolFlags.Interface);
console.log('TypeParameter:', ts.SymbolFlags.TypeParameter);
console.log('Alias:', ts.SymbolFlags.Alias);
console.log('Value:', ts.SymbolFlags.Value);
