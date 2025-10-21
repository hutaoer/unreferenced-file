import type { Compiler } from "webpack";
import * as fs from 'fs';
import * as path from 'path';
import { sync } from 'glob';
import * as ts from 'typescript';

// 日志工具对象，用于输出信息、警告和错误
const log = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

// 黑名单目录，这些目录下的文件不会被扫描
const black_list = [
  'node_modules',  // npm 依赖包目录
  'dist',          // 构建输出目录
  'build',         // 构建目录
  'es',            // ES 模块输出目录
  'lib',           // 库文件输出目录
]
/**
 * 未使用文件插件配置选项接口
 */
export interface UnusedFilesPluginOptions {
  /**
   * 是否将未使用文件列表写入磁盘
   * @default false
   */
  writeDisk?: boolean;
  /**
   * 输出文件名称
   * @default unused-files.json
   */
  name?: string;
  /** 
   * 项目根目录路径
   * @default process.cwd()
   */
  root?: string;
  /** 
   * 要扫描的文件模式（glob 模式）
   * @default 
   */
  include?: string | string[];
  /** 
   * 要排除的文件模式（glob 模式）
   * @example 
   */
  exclude?: string[];
  /** 
   * 支持的文件扩展名
   * @default ['.js', '.jsx', '.ts', '.tsx']  
   */
  extensions?: string[];
  /** 
   * 是否显示详细的扫描日志
   * @default false
   */
  verbose?: boolean;
  /** 
   * 是否检测 TypeScript 类型引用
   * 启用后会扫描类型导入和导出，避免将仅被类型引用的文件标记为未使用
   * @default true
   */
  checkTypeReferences?: boolean;
  /** 
   * TypeScript 配置文件路径
   * @default tsconfig.json
   */
  tsconfigPath?: string;
};

/**
 * 未使用文件检测插件
 * 用于检测项目中未被引用的文件，支持 TypeScript 类型引用检测
 */
export default class UnusedFilesPlugin {
  /** 所有扫描到的文件集合 */
  files: Set<string> = new Set();

  /** 未使用的文件列表 */
  unusedFiles: string[] = [];

  /** 插件配置选项 */
  options: UnusedFilesPluginOptions = {}

  /** 被值引用的文件集合（通过 TypeScript AST 分析得出，严格策略：纯类型引用不计入） */
  typeReferencedFiles: Set<string> = new Set();

  /** TypeScript 路径别名配置（从 tsconfig.json 中解析） */
  tsConfigPaths: Record<string, string[]> | null = null;

 /**
  * 构造函数
  * @param options 插件配置选项
  */
 constructor(options: UnusedFilesPluginOptions = {}) {
   // 设置默认配置，用户传入的选项会覆盖默认值
   this.options = {
     writeDisk: false,                    // 默认不写入磁盘
     name: 'unused-files.json',          // 默认输出文件名
     include: ['src/**/*'],              // 默认扫描 src 目录下所有文件
     exclude: [],                        // 默认不排除任何文件
     extensions: ['.js', '.jsx', '.ts', '.tsx'], // 默认支持的文件扩展名
     verbose: false,                     // 默认不显示详细日志
     checkTypeReferences: true,          // 默认启用类型引用检测
     tsconfigPath: 'tsconfig.json',      // 默认 TypeScript 配置文件路径
     ...options                          // 用户自定义配置覆盖默认值
   };

   // 扫描指定目录下的所有文件
   this.files = new Set(this.scanDirectory(this.options.root || process.cwd()));

   // 如果启用类型引用检测，扫描 TypeScript 类型引用
   if (this.options.checkTypeReferences) {
     this.scanTypeReferences();
   }
 }

 /**
  * 检查目录名是否在白名单中（即是否应该被扫描）
  * @param dirName 目录名
  * @returns 如果目录应该被扫描返回 true，否则返回 false
  */
 isWhiteList = (dirName: string) => {
   // 检查是否在黑名单中
   if (black_list.includes(dirName)) return false;
   // 跳过隐藏目录（以 . 开头的目录）
   if (dirName.startsWith('.')) return false;
   return true;
 }

 /**
  * 递归扫描目录，根据配置的 glob 模式收集所有符合条件的文件
  * @param directory 要扫描的目录路径
  * @returns 符合条件的文件路径数组
  */
 scanDirectory = (directory: string): string[] => {
  console.log('directory', directory);
   // 处理 include 配置，确保是数组格式
   const includePatterns = Array.isArray(this.options.include)
     ? this.options.include
     : [this.options.include || 'src/**/*'];

   let allFiles: string[] = [];

   // 对每个 include 模式进行扫描
   includePatterns.forEach(pattern => {
     const files = sync(pattern, {
       cwd: directory,        // 工作目录
       nodir: true,          // 只返回文件，不返回目录
       absolute: true,       // 返回绝对路径
       ignore: [
         // 忽略黑名单目录
         ...black_list.map(t => `**/${t}/**`),
         // 忽略用户配置的排除模式
         ...(this.options.exclude || [])
       ],
     });
     allFiles = allFiles.concat(files);
   });

   // 去重，避免重复文件
   allFiles = [...new Set(allFiles)];
   console.log('allFiles', allFiles);

   // 按文件扩展名过滤，只保留支持的文件类型
   if (this.options.extensions && this.options.extensions.length > 0) {
     allFiles = allFiles.filter(file => {
       const ext = path.extname(file);
       return this.options.extensions!.includes(ext);
     });
   }

   // 如果启用详细日志，输出扫描信息
   if (this.options.verbose) {
     log.info(`[unusedFiles]扫描目录: ${directory}`);
     log.info(`[unusedFiles]匹配模式: ${includePatterns.join(', ')}`);
     log.info(`[unusedFiles]支持扩展名: ${this.options.extensions?.join(', ') || '所有文件'}`);
     log.info(`[unusedFiles]总计: ${allFiles.length} 个文件`);
   }

   return allFiles;
 }

 /**
  * 扫描 TypeScript 值引用
  * 通过解析 tsconfig.json 和 TypeScript AST 来识别被值引用的文件
  * 严格策略：纯类型导入/导出不视为文件使用
  */
 scanTypeReferences = (): void => {
   try {
     const root = this.options.root || process.cwd();
     const tsconfigPath = path.resolve(root, this.options.tsconfigPath!);

     // 检查 TypeScript 配置文件是否存在
     if (!fs.existsSync(tsconfigPath)) {
       if (this.options.verbose) {
         log.warn(`[unusedFiles]TypeScript 配置文件不存在: ${tsconfigPath}`);
       }
       return;
     }

     // 读取并解析 tsconfig.json 文件
     const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
     console.log('configFile', configFile);
     if (configFile.error) {
       if (this.options.verbose) {
         log.error('[unusedFiles]读取 tsconfig.json 失败:' + configFile.error.messageText);
       }
       return;
     }

     // 解析 TypeScript 配置内容
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

     // 解析路径别名配置（如 @/ -> src/）
     if (configFile.config.compilerOptions?.paths) {
       this.tsConfigPaths = configFile.config.compilerOptions.paths;
     }

     // 创建 TypeScript 程序实例
     const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    //  console.log('program', program);
     const typeChecker = program.getTypeChecker();
    //  console.log('typeChecker', typeChecker);

     // 遍历所有源文件，分析类型引用
     program.getSourceFiles().forEach(sourceFile => {
      
       // 跳过 node_modules 中的文件
       if (sourceFile.fileName.includes('node_modules')) return;
       // 访问 AST 节点，查找类型导入和导出
       this.visitNode(sourceFile, sourceFile, typeChecker);
     });

   } catch (error) {
     if (this.options.verbose) {
       log.error('[unusedFiles]扫描类型引用时出错:', error);
     }
   }
 }

 /**
  * 访问 AST 节点，查找值导入和导出
  * 递归遍历 TypeScript AST，识别所有值相关的导入和导出语句
  * 严格策略：纯类型导入/导出不视为文件使用
  * @param node 当前 AST 节点
  * @param sourceFile 源文件对象
  * @param typeChecker TypeScript 类型检查器
  */
 visitNode = (node: ts.Node, sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): void => {
  // 检查 import 语句
  if (ts.isImportDeclaration(node)) {
    const moduleSpecifier = node.moduleSpecifier;
    if (ts.isStringLiteral(moduleSpecifier)) {
      const importPath = moduleSpecifier.text;

      // 检查是否是显式的类型导入（import type ...）
      const isTypeOnlyImport = node.importClause?.isTypeOnly;
      const hasTypeOnlySpecifiers = node.importClause?.namedBindings && 
        ts.isNamedImports(node.importClause.namedBindings) &&
        node.importClause.namedBindings.elements.some(element => element.isTypeOnly);

      // 改进策略：检查类型导入是否在代码中被实际使用
      if (isTypeOnlyImport || hasTypeOnlySpecifiers) {
        // 如果是类型导入，检查是否在代码中被使用
        if (this.isTypeImportUsed(node, sourceFile, typeChecker)) {
          const resolvedPath = this.resolveImportPath(importPath, sourceFile.fileName);
          if (resolvedPath) {
            this.typeReferencedFiles.add(resolvedPath);
          }
        }
      } else {
        // 非类型导入直接标记为使用中
        const resolvedPath = this.resolveImportPath(importPath, sourceFile.fileName);
        if (resolvedPath) {
          this.typeReferencedFiles.add(resolvedPath);
        }
      }
    }
  }

  // 检查 export 语句（重新导出）
  if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
    if (ts.isStringLiteral(node.moduleSpecifier)) {
      const importPath = node.moduleSpecifier.text;
      
      // 检查是否是类型导出（export type ...）
      const isTypeOnlyExport = node.isTypeOnly;
      const hasTypeOnlySpecifiers = node.exportClause && 
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.some(element => element.isTypeOnly);

      // 严格策略：只有非类型导出才标记为使用中
      if (!isTypeOnlyExport && !hasTypeOnlySpecifiers) {
        const resolvedPath = this.resolveImportPath(importPath, sourceFile.fileName);
        if (resolvedPath) {
          this.typeReferencedFiles.add(resolvedPath);
        }
      }
    }
  }

  // 递归访问子节点，确保遍历整个 AST
  ts.forEachChild(node, child => this.visitNode(child, sourceFile, typeChecker));
}

/**
 * 检查类型导入是否在代码中被实际使用
 * @param importNode 导入声明节点
 * @param sourceFile 源文件对象
 * @param typeChecker TypeScript 类型检查器
 * @returns 如果类型被使用返回 true，否则返回 false
 */
private isTypeImportUsed = (
  importNode: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker
): boolean => {
  const importClause = importNode.importClause;
  if (!importClause) return false;

  // 收集导入的类型名称
  const importedTypeNames = new Set<string>();
  
  // 检查默认导入
  if (importClause.name) {
    importedTypeNames.add(importClause.name.text);
  }

  // 检查命名导入中的类型
  if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    for (const element of importClause.namedBindings.elements) {
      if (element.isTypeOnly) {
        importedTypeNames.add(element.name.text);
      }
    }
  }

  // 如果整个导入是类型导入，收集所有导入的名称
  if (importClause.isTypeOnly && importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    for (const element of importClause.namedBindings.elements) {
      importedTypeNames.add(element.name.text);
    }
  }

  // 检查这些类型名称是否在代码中被使用
  let isUsed = false;
  const checkUsage = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      if (importedTypeNames.has(node.text)) {
        // 检查是否在类型位置使用
        const parent = node.parent;
        if (parent && (
          ts.isTypeReferenceNode(parent) ||
          ts.isTypeAliasDeclaration(parent) ||
          ts.isInterfaceDeclaration(parent) ||
          ts.isTypeParameterDeclaration(parent) ||
          ts.isVariableDeclaration(parent) ||
          ts.isParameter(parent) ||
          ts.isPropertyDeclaration(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isFunctionDeclaration(parent)
        )) {
          isUsed = true;
        }
      }
    }
    ts.forEachChild(node, checkUsage);
  };

  // 遍历整个源文件检查使用情况
  checkUsage(sourceFile);
  return isUsed;
}






 /**
  * 解析导入路径为绝对路径
  * 支持相对路径和 TypeScript 路径别名解析
  * @param importPath 导入路径字符串
  * @param fromFile 导入来源文件的绝对路径
  * @returns 解析后的绝对路径，如果解析失败返回 null
  */
 resolveImportPath = (importPath: string, fromFile: string): string | null => {
   try {
     const fromDir = path.dirname(fromFile);
     const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];

     // 处理相对路径（以 . 开头）
     if (importPath.startsWith('.')) {
       return this.resolveRelativePath(importPath, fromDir, possibleExtensions);
     }
     
     // 处理路径别名（如 @/ -> src/）
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
  * 尝试不同的文件扩展名和 index 文件来解析相对导入路径
  * @param importPath 相对导入路径
  * @param fromDir 导入来源目录
  * @param extensions 可能的文件扩展名数组
  * @returns 解析后的绝对路径，如果解析失败返回 null
  */
 private resolveRelativePath = (importPath: string, fromDir: string, extensions: string[]): string | null => {
   // 尝试不同的扩展名（如 ./utils/foo -> ./utils/foo.ts）
   for (const ext of extensions) {
     const fullPath = path.resolve(fromDir, importPath + ext);
     if (fs.existsSync(fullPath)) {
       return fullPath;
     }
   }

   // 尝试 index 文件（如 ./utils -> ./utils/index.ts）
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
  * 根据 tsconfig.json 中的 paths 配置解析路径别名（如 @/ -> src/）
  * @param importPath 导入路径字符串
  * @param extensions 可能的文件扩展名数组
  * @returns 解析后的绝对路径，如果解析失败返回 null
  */
 private resolvePathAlias = (importPath: string, extensions: string[]): string | null => {
   if (!this.tsConfigPaths) return null;

   // 遍历所有路径别名配置
   for (const [alias, mappings] of Object.entries(this.tsConfigPaths)) {
     // 将 tsconfig 中的路径模式转换为正则表达式（如 @/* -> @/(.*)）
     const aliasPattern = alias.replace('*', '(.*)');
     const regex = new RegExp(`^${aliasPattern}$`);
     const match = importPath.match(regex);
     
     if (match) {
       const matchedPart = match[1] || '';
       
       // 遍历所有映射路径
       for (const mapping of mappings) {
         // 替换映射路径中的 * 为匹配的部分（如 src/* -> src/utils）
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
  * Webpack 插件应用方法
  * 在 webpack 构建完成后分析未使用的文件
  * @param compiler Webpack 编译器实例
  */
 apply(compiler: Compiler) {
   // 在 webpack 构建完成后（afterEmit 阶段）执行分析
   compiler.hooks.afterEmit.tapAsync('UnusedFilesPlugin', (compilation, callback) => {
     try {
       // 获取所有入口文件
       const entryFiles = new Set<string>();
       Object.values(compilation.options.entry).forEach((entry: any) => {
         if (entry.import) {
           if (Array.isArray(entry.import)) {
             // 处理多入口情况
             entry.import.forEach((importPath: string) => {
               entryFiles.add(path.resolve(importPath));
             });
           } else {
             // 处理单入口情况
             entryFiles.add(path.resolve(entry.import));
           }
         }
       });

       // 获取所有被 webpack 使用的模块文件
       const usedFiles = new Set<string>();
       compilation.modules.forEach((module: any) => {
         if (module.resource) {
           usedFiles.add(module.resource);
         }
       });

       // 分析并找出未使用的文件
       this.unusedFiles = [];
       this.files.forEach(file => {
         const isEntry = entryFiles.has(file);           // 是否为入口文件
         const isUsed = usedFiles.has(file);             // 是否被 webpack 使用
         const isTypeReferenced = this.typeReferencedFiles.has(file); // 是否被类型引用

         // 只有既不是入口、又未被使用、又未被类型引用的文件才被认为是未使用
         if (!isEntry && !isUsed && !isTypeReferenced) {
           this.unusedFiles.push(file);
         }
       });

       // 如果启用详细日志，输出分析统计信息
       if (this.options.verbose) {
         log.info(`[unusedFiles]入口文件数量: ${entryFiles.size}`);
         log.info(`[unusedFiles]使用的模块数量: ${usedFiles.size}`);
         log.info(`[unusedFiles]类型引用文件数量: ${this.typeReferencedFiles.size}`);
         log.info(`[unusedFiles]未使用文件数量: ${this.unusedFiles.length}`);
       }

     } catch (error) {
       log.error('[unusedFiles]UnusedFilesPlugin 分析过程中出错:', error);
     }

     // 通知 webpack 继续执行
     callback();
   });

   // 在 webpack 构建完成后（done 阶段）输出结果
   compiler.hooks.done.tap('UnusedFilesPlugin', (stats) => {
     // 如果没有发现未使用的文件，输出成功信息
     if (this.unusedFiles.length === 0) {
       log.info('[unusedFiles]🎉 没有发现未使用的文件！');
       return;
     }

     // 输出未使用文件列表
     log.warn(`[unusedFiles]⚠️  发现 ${this.unusedFiles.length} 个未使用的文件:`);
     this.unusedFiles.forEach(file => {
       const relativePath = path.relative(this.options.root || process.cwd(), file);
       log.warn(`[unusedFiles]  - ${relativePath}`);
     });

     // 如果配置了写入磁盘，将未使用文件列表保存为 JSON 文件
     if (this.options.writeDisk) {
       try {
         const outputPath = path.resolve(this.options.root || process.cwd(), this.options.name!);
         const reportData = {
           timestamp: new Date().toISOString(),    // 报告生成时间
           totalScanned: this.files.size,          // 总扫描文件数
           unusedCount: this.unusedFiles.length,   // 未使用文件数量
           unusedFiles: this.unusedFiles.map(file => ({
             absolutePath: file,                   // 绝对路径
             relativePath: path.relative(this.options.root || process.cwd(), file) // 相对路径
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


