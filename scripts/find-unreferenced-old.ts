import type { Compiler } from "webpack";
import * as fs from 'fs';
import * as path from 'path';
import { sync } from 'glob';
import * as ts from 'typescript';

const log = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};
const black_list = [
  'node_modules',
  'dist',
  'build',
  'es',
  'lib',
]
export interface UnusedFilesPluginOptions {
   /**
   * 是否输出文件
   * @default true
   */
  writeDisk?: boolean;
   /**
    * 输出文件名称
    * @default unused-files.json
    */
   name?: string;
   /** 
   * 根目录
    * @default ${pack.options.root}
    */
   root?: string;
   /** 
   * 筛选 glob 模式
   * @default src/* * / *
    */
  include?: string | string[];
   /** 
   * 排除 glob 模式数组
    * @example 同include
    */
   exclude?: string[];
  /** 
   * 支持的文件扩展名
   * @default ['.js', '.jsx', '.ts', '.tsx']  
   */
  extensions?: string[];
  /** 
   * 是否显示详细日志
   * @default false
   */
  verbose?: boolean;
  /** 
   * 是否检测 TypeScript 类型引用
   * @default true
   */
  checkTypeReferences?: boolean;
  /** 
   * TypeScript 配置文件路径
   * @default tsconfig.json
   */
  tsconfigPath?: string;
  /**
   * 将仅类型引用的文件视为未使用
   * @default false
   */
  treatTypeOnlyAsUnused?: boolean;  /**
   * 严格模式：仅当导入在“值位置”被实际使用时，才将其计为依赖
   * 并保留纯副作用导入
   * @default false
   */
  strictRuntimeUsage?: boolean;
};

export default class UnusedFilesPlugin {
  files: Set<string> = new Set();

  unusedFiles: string[] = [];

  options: UnusedFilesPluginOptions = {}

  typeReferencedFiles: Set<string> = new Set();

  tsConfigPaths: Record<string, string[]> | null = null;

  constructor(options: UnusedFilesPluginOptions = {}) {
    // 设置默认配置
    this.options = {
      writeDisk: false,
      name: 'unused-files.json',
      include: ['src/**/*'],
      exclude: [],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      verbose: false,
      checkTypeReferences: true,
      tsconfigPath: 'tsconfig.json',
      treatTypeOnlyAsUnused: false,
      strictRuntimeUsage: false,
      ...options
    };

    this.files = new Set(this.scanDirectory(this.options.root || process.cwd()));

    // 如果启用类型引用检测，扫描类型引用
    if (this.options.checkTypeReferences) {
      this.scanTypeReferences();
    }
  }

  isWhiteList = (dirName: string) => {
    if (black_list.includes(dirName)) return false;
    if (dirName.startsWith('.')) return false;
    return true
  }

  /**
   * 递归扫描目录
   */
  scanDirectory = (directory: string): string[] => {
    const includePatterns = Array.isArray(this.options.include)
      ? this.options.include
      : [this.options.include || 'src/**/*'];

    let allFiles: string[] = [];

    // 对每个 include 模式进行扫描
    includePatterns.forEach(pattern => {
      const files = sync(pattern, {
        cwd: directory,
      nodir: true,
      absolute: true,
        ignore: [
          ...black_list.map(t => `**/${t}/**`),
          ...(this.options.exclude || [])
        ],
      });
      allFiles = allFiles.concat(files);
    });

    // 去重
    allFiles = [...new Set(allFiles)];

    // 按文件扩展名过滤
    if (this.options.extensions && this.options.extensions.length > 0) {
      allFiles = allFiles.filter(file => {
        const ext = path.extname(file);
        return this.options.extensions!.includes(ext);
      });
    }

    if (this.options.verbose) {
      log.info(`[unusedFiles]扫描目录: ${directory}`);
      log.info(`[unusedFiles]匹配模式: ${includePatterns.join(', ')}`);
      log.info(`[unusedFiles]支持扩展名: ${this.options.extensions?.join(', ') || '所有文件'}`);
      log.info(`[unusedFiles]总计: ${allFiles.length} 个文件`);
    }

    return allFiles;
  }

  /**
   * 扫描 TypeScript 类型引用
   */
  scanTypeReferences = (): void => {
    try {
      const root = this.options.root || process.cwd();
      const tsconfigPath = path.resolve(root, this.options.tsconfigPath!);

      if (!fs.existsSync(tsconfigPath)) {
        if (this.options.verbose) {
          log.warn(`[unusedFiles]TypeScript 配置文件不存在: ${tsconfigPath}`);
        }
        return;
      }

      // 读取 tsconfig.json
      const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
      if (configFile.error) {
        if (this.options.verbose) {
          log.error('[unusedFiles]读取 tsconfig.json 失败:' + configFile.error.messageText);
        }
        return;
      }

      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(tsconfigPath)
      );

      if (parsedConfig.errors.length > 0) {
        if (this.options.verbose) {
          log.error('[unusedFiles]解析 tsconfig.json 失败:' + parsedConfig.errors[0].messageText);
        }
        return;
      }

      // 解析路径别名配置
      if (configFile.config.compilerOptions?.paths) {
        this.tsConfigPaths = configFile.config.compilerOptions.paths;
      }

      // 创建 TypeScript 程序
      const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
      const typeChecker = program.getTypeChecker();

      // 遍历所有源文件
      program.getSourceFiles().forEach(sourceFile => {
        if (sourceFile.fileName.includes('node_modules')) return;

        this.visitNode(sourceFile, sourceFile, typeChecker);
      });



    } catch (error) {
      if (this.options.verbose) {
        log.error('[unusedFiles]扫描类型引用时出错:', error);
      }
    }
  }

    /**
   * 访问 AST 节点，查找类型导入和导出
   */
  visitNode = (node: ts.Node, sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): void => {
    // 检查 import 语句
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text;
 
        // 检查是否是显式的类型导入
        const isTypeOnlyImport = node.importClause?.isTypeOnly;
        const hasTypeOnlySpecifiers = node.importClause?.namedBindings && 
          ts.isNamedImports(node.importClause.namedBindings) &&
          node.importClause.namedBindings.elements.some(element => element.isTypeOnly);

        // 如果是显式类型导入，直接标记
        if (isTypeOnlyImport || hasTypeOnlySpecifiers) {
          const resolvedPath = this.resolveImportPath(importPath, sourceFile.fileName);
          if (resolvedPath) {
            this.typeReferencedFiles.add(resolvedPath);
          }
        } else {
          // 检查普通导入中是否包含类型
          this.checkImportForTypes(node, importPath, sourceFile, typeChecker);
        }
      }
    }

    // 检查 export 语句（重新导出类型）
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const importPath = node.moduleSpecifier.text;
        
        // 检查是否是类型导出
        const isTypeOnlyExport = node.isTypeOnly;
        const hasTypeOnlySpecifiers = node.exportClause && 
          ts.isNamedExports(node.exportClause) &&
          node.exportClause.elements.some(element => element.isTypeOnly);

        if (isTypeOnlyExport || hasTypeOnlySpecifiers) {
          const resolvedPath = this.resolveImportPath(importPath, sourceFile.fileName);
          if (resolvedPath) {
            this.typeReferencedFiles.add(resolvedPath);
          }
        } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          // 检查普通导出中是否包含类型
          this.checkExportForTypes(node, importPath, sourceFile, typeChecker);
        }
      }
    }

    // 递归访问子节点
    ts.forEachChild(node, child => this.visitNode(child, sourceFile, typeChecker));
  }

  /**
   * 检查普通导入语句中是否包含类型
   */
  private checkImportForTypes = (
    importNode: ts.ImportDeclaration, 
    importPath: string, 
    sourceFile: ts.SourceFile, 
    typeChecker: ts.TypeChecker
  ): void => {
    const importClause = importNode.importClause;
    if (!importClause) return;

    let hasTypeImports = false;

    // 检查默认导入
    if (importClause.name) {
      const symbol = typeChecker.getSymbolAtLocation(importClause.name);
      if (symbol && this.isTypeSymbol(symbol, typeChecker)) {
        hasTypeImports = true;
      }
    }

    // 检查命名导入
    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        const symbol = typeChecker.getSymbolAtLocation(element.name);
        

        
        if (symbol) {
          // 尝试多种方式检测类型
          const isType = this.isTypeSymbol(symbol, typeChecker) || this.isTypeByUsage(element, typeChecker);
          if (isType) {
            hasTypeImports = true;
          }
        }

        // 特殊处理：如果导入路径包含 'types' 或 'typings'，保守地认为是类型文件
        if (importPath.includes('types') || importPath.includes('typings')) {
          hasTypeImports = true;
        }
      }
    }

    // 如果包含类型导入，标记文件
    if (hasTypeImports) {
      const resolvedPath = this.resolveImportPath(importPath, sourceFile.fileName);
      if (resolvedPath) {
        this.typeReferencedFiles.add(resolvedPath);
      }
    }
  }

  /**
   * 检查普通导出语句中是否包含类型
   */
  private checkExportForTypes = (
    exportNode: ts.ExportDeclaration,
    importPath: string,
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker
  ): void => {
    if (!exportNode.exportClause || !ts.isNamedExports(exportNode.exportClause)) return;

    let hasTypeExports = false;

    // 检查命名导出
    for (const element of exportNode.exportClause.elements) {
      const symbol = typeChecker.getSymbolAtLocation(element.name);
      if (symbol && this.isTypeSymbol(symbol, typeChecker)) {
        hasTypeExports = true;
        break; // 找到一个类型导出就足够了
      }
    }

    // 如果包含类型导出，标记文件
    if (hasTypeExports) {
      const resolvedPath = this.resolveImportPath(importPath, sourceFile.fileName);
      if (resolvedPath) {
        this.typeReferencedFiles.add(resolvedPath);
      }
    }
  }

  /**
   * 通过使用上下文判断是否为类型
   */
  private isTypeByUsage = (element: ts.ImportSpecifier, _typeChecker: ts.TypeChecker): boolean => {
    try {
      const type = _typeChecker.getTypeAtLocation(element.name);
      if (!type) return false;
        
      // 检查是否是类型相关的标志
      const typeFlags = type.flags;
      if (typeFlags & (ts.TypeFlags.Object | ts.TypeFlags.Union | ts.TypeFlags.Intersection | 
                      ts.TypeFlags.Index | ts.TypeFlags.IndexedAccess | ts.TypeFlags.Conditional | 
                      ts.TypeFlags.Substitution)) {
        
        // 进一步检查是否是纯类型（没有运行时值）
        const symbol = type.symbol || type.aliasSymbol;
        if (symbol?.declarations?.length) {
          const firstDecl = symbol.declarations[0];
          return ts.isTypeAliasDeclaration(firstDecl) || 
                 ts.isInterfaceDeclaration(firstDecl) || 
                 ts.isTypeParameterDeclaration(firstDecl);
        }
      }
    } catch (error) {
      // 静默处理错误
    }
    
    return false;
  }



  /**
   * 判断符号是否为类型
   */
  private isTypeSymbol = (symbol: ts.Symbol, _typeChecker: ts.TypeChecker): boolean => {
    // 检查符号标志
    const flags = symbol.flags;
    
    // 类型相关的标志
    if (flags & ts.SymbolFlags.Type ||
        flags & ts.SymbolFlags.TypeAlias ||
        flags & ts.SymbolFlags.Interface ||
        flags & ts.SymbolFlags.TypeParameter) {
      return true;
    }

    // 检查是否是枚举类型（枚举既可以作为类型也可以作为值）
    if (flags & ts.SymbolFlags.Enum) {
      return true;
    }

    // 检查是否是类（类既可以作为类型也可以作为值）
    if (flags & ts.SymbolFlags.Class) {
      return true;
    }

    return false;
  }



    /**
   * 解析导入路径为绝对路径
   */
  resolveImportPath = (importPath: string, fromFile: string): string | null => {
    try {
      const fromDir = path.dirname(fromFile);
      const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
 
      // 相对路径
      if (importPath.startsWith('.')) {
        return this.resolveRelativePath(importPath, fromDir, possibleExtensions);
      }
      
      // 路径别名 (如 @/, @@/ 等)
      if (this.tsConfigPaths) {
        const resolvedPath = this.resolvePathAlias(importPath, possibleExtensions);
        if (resolvedPath) {
          return resolvedPath;
        }
      }
 
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析相对路径
   */
  private resolveRelativePath = (importPath: string, fromDir: string, extensions: string[]): string | null => {
    // 尝试不同的扩展名
    for (const ext of extensions) {
      const fullPath = path.resolve(fromDir, importPath + ext);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
 
    // 尝试 index 文件
    for (const ext of extensions) {
      const indexPath = path.resolve(fromDir, importPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }

  /**
   * 解析 TypeScript 路径别名
   */
  private resolvePathAlias = (importPath: string, extensions: string[]): string | null => {
    if (!this.tsConfigPaths) return null;

    for (const [alias, mappings] of Object.entries(this.tsConfigPaths)) {
      // 将 tsconfig 中的路径模式转换为正则表达式
      const aliasPattern = alias.replace('*', '(.*)');
      const regex = new RegExp(`^${aliasPattern}$`);
      const match = importPath.match(regex);
      
      if (match) {
        const matchedPart = match[1] || '';
        
        for (const mapping of mappings) {
          // 替换映射路径中的 * 为匹配的部分
          const resolvedMapping = mapping.replace('*', matchedPart);
          const basePath = path.resolve(this.options.root || process.cwd(), resolvedMapping);
          
          // 尝试不同的扩展名
          for (const ext of extensions) {
            const fullPath = basePath + ext;
            if (fs.existsSync(fullPath)) {
              return fullPath;
            }
          }
          
          // 尝试 index 文件
          for (const ext of extensions) {
            const indexPath = path.resolve(basePath, 'index' + ext);
            if (fs.existsSync(indexPath)) {
              return indexPath;
            }
          }
        }
      }
    }
    
    return null;
  }

  /**
   * 基于 TypeScript AST 构建仅值位置使用的依赖图，并从入口出发求可达文件
   */
  public runtimeReachable = (entryFiles: Set<string>): Set<string> => {
    try {
      const root = this.options.root || process.cwd();
      const tsconfigPath = require('path').resolve(root, this.options.tsconfigPath || 'tsconfig.json');
      const tsmod = ts as typeof import('typescript');

      const configFile = tsmod.readConfigFile(tsconfigPath, tsmod.sys.readFile);
      const parsed = tsmod.parseJsonConfigFileContent(configFile.config, tsmod.sys, require('path').dirname(tsconfigPath));
      const program = tsmod.createProgram(parsed.fileNames, parsed.options);

      type Graph = Map<string, Set<string>>;
      const graph: Graph = new Map();

      function isInTypePosition(node: ts.Node): boolean {
        let cur: ts.Node | undefined = node;
        while (cur) {
          if (
            tsmod.isTypeNode(cur) ||
            tsmod.isTypeAliasDeclaration(cur) ||
            tsmod.isInterfaceDeclaration(cur) ||
            tsmod.isHeritageClause(cur) ||
            tsmod.isImportTypeNode(cur) ||
            tsmod.isTypeQueryNode(cur)
          ) return true;
          cur = cur.parent;
        }
        return false;
      }

      for (const sourceFile of program.getSourceFiles()) {
        const from = sourceFile.fileName;
        if (from.includes('node_modules')) continue;
        if (!graph.has(from)) graph.set(from, new Set());

        type ImportBinding = { local: string; isNamespace: boolean; targetFile: string };
        const importBindings: ImportBinding[] = [];
        const sideEffectTargets: Set<string> = new Set();

        tsmod.forEachChild(sourceFile, node => {
          if (!tsmod.isImportDeclaration(node)) return;
          const spec = node.moduleSpecifier;
          const ic = node.importClause;
          if (!tsmod.isStringLiteral(spec)) return;
          const resolved = tsmod.resolveModuleName(spec.text, from, program.getCompilerOptions(), tsmod.sys);
          const target = resolved.resolvedModule?.resolvedFileName;
          if (!target || target.includes('node_modules')) return;

          if (!ic) { // side-effect import
            sideEffectTargets.add(target);
            return;
          }
          if (ic.isTypeOnly) return; // ignore whole type import

          if (ic.name) importBindings.push({ local: ic.name.text, isNamespace: false, targetFile: target });
          if (ic.namedBindings) {
            if (tsmod.isNamespaceImport(ic.namedBindings)) {
              importBindings.push({ local: ic.namedBindings.name.text, isNamespace: true, targetFile: target });
            } else if (tsmod.isNamedImports(ic.namedBindings)) {
              for (const el of ic.namedBindings.elements) {
                if (el.isTypeOnly) continue;
                importBindings.push({ local: el.name.text, isNamespace: false, targetFile: target });
              }
            }
          }
        });

        const usedTargets = new Set<string>(sideEffectTargets);
        function isInsideImport(node: ts.Node): boolean {
          let cur: ts.Node | undefined = node;
          while (cur) {
            if (
              tsmod.isImportDeclaration(cur) ||
              tsmod.isImportClause(cur) ||
              tsmod.isImportSpecifier(cur) ||
              tsmod.isNamespaceImport(cur)
            ) return true;
            cur = cur.parent;
          }
          return false;
        }
        function scan(node: ts.Node) {
          if (tsmod.isIdentifier(node) && !isInTypePosition(node) && !isInsideImport(node)) {
            const name = (node as ts.Identifier).text;
            for (const b of importBindings) {
              if (!b.isNamespace && b.local === name) usedTargets.add(b.targetFile);
            }
          }
          if (
            tsmod.isPropertyAccessExpression(node) && tsmod.isIdentifier(node.expression) &&
            !isInTypePosition(node) && !isInsideImport(node)
          ) {
            const ns = (node.expression as ts.Identifier).text;
            for (const b of importBindings) {
              if (b.isNamespace && b.local === ns) usedTargets.add(b.targetFile);
            }
          }
          tsmod.forEachChild(node, scan);
        }
        scan(sourceFile);

        if (!graph.has(from)) graph.set(from, new Set());
        for (const target of usedTargets) graph.get(from)!.add(target);
      }

      const visited = new Set<string>();
      const stack: string[] = Array.from(entryFiles);
      while (stack.length) {
        const cur = stack.pop()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        const deps = graph.get(cur);
        if (deps) for (const d of deps) stack.push(d);
      }
      return visited;
    } catch {
      return new Set<string>();
    }
  }

  apply(compiler: Compiler) {
    compiler.hooks.afterEmit.tapAsync('UnusedFilesPlugin', (compilation, callback) => {
      try {
        // 获取所有入口文件
        const entryFiles = new Set<string>();
        Object.values(compilation.options.entry).forEach((entry: any) => {
          if (entry.import) {
            if (Array.isArray(entry.import)) {
              entry.import.forEach((importPath: string) => {
                entryFiles.add(path.resolve(importPath));
              });
            } else {
              entryFiles.add(path.resolve(entry.import));
            }
          }
        });

        // 获取所有被使用的模块文件
        let usedFiles = new Set<string>();
        if (this.options.strictRuntimeUsage) {
          // 使用 AST 严格模式：仅值位置使用 + 副作用导入
          usedFiles = this.runtimeReachable(entryFiles);
        } else {
          // 默认：依赖 webpack 模块图
          compilation.modules.forEach((module: any) => {
            if (module.resource) usedFiles.add(module.resource);
          });
        }

        // 找出未使用的文件
        this.unusedFiles = [];
        this.files.forEach(file => {
          const isEntry = entryFiles.has(file);
          const isUsed = usedFiles.has(file);
          const isTypeReferenced = this.typeReferencedFiles.has(file);

          // 当 treatTypeOnlyAsUnused=true 时，纯类型引用不再视为“已引用”
          const isReferenced = isUsed || (!this.options.treatTypeOnlyAsUnused && isTypeReferenced);

          if (!isEntry && !isReferenced) {
            this.unusedFiles.push(file);
          }
        });

        if (this.options.verbose) {
          log.info(`[unusedFiles]入口文件数量: ${entryFiles.size}`);
          log.info(`[unusedFiles]使用的模块数量: ${usedFiles.size}`);
          log.info(`[unusedFiles]类型引用文件数量: ${this.typeReferencedFiles.size}`);
          log.info(`[unusedFiles]未使用文件数量: ${this.unusedFiles.length}`);
        }

      } catch (error) {
        log.error('[unusedFiles]UnusedFilesPlugin 分析过程中出错:', error);
      }

      callback();
    });

    compiler.hooks.done.tap('UnusedFilesPlugin', (_stats) => {
      if (this.unusedFiles.length === 0) {
        log.info('[unusedFiles]🎉 没有发现未使用的文件！');
        return;
      }

      log.warn(`[unusedFiles]⚠️  发现 ${this.unusedFiles.length} 个未使用的文件:`);
      this.unusedFiles.forEach(file => {
        const relativePath = path.relative(this.options.root || process.cwd(), file);
        log.warn(`[unusedFiles]  - ${relativePath}`);
      });

      // 将未使用的文件列表写入 JSON 文件
      if (this.options.writeDisk) {
        try {
          const outputPath = path.resolve(this.options.root || process.cwd(), this.options.name!);
          const reportData = {
            timestamp: new Date().toISOString(),
            totalScanned: this.files.size,
            unusedCount: this.unusedFiles.length,
            unusedFiles: this.unusedFiles.map(file => ({
              absolutePath: file,
              relativePath: path.relative(this.options.root || process.cwd(), file)
            }))
          };

          fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
          log.info(`[unusedFiles]📒 未使用文件报告已保存到: ${outputPath}`);
        } catch (error) {
          log.error('[unusedFiles]📒 保存未使用文件报告失败:', error);
        }
      }
    });
  }
}

module.exports = UnusedFilesPlugin;
