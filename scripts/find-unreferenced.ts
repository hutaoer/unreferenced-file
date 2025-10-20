import ts from 'typescript';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// 依赖图类型：文件路径 -> 依赖的文件路径集合
type Graph = Map<string, Set<string>>;

/**
 * 读取并解析 tsconfig.json 配置文件
 * @param tsconfigPath 配置文件路径
 * @returns 解析后的配置对象
 */
function readTsConfig(tsconfigPath: string) {
  const configPath = ts.findConfigFile(tsconfigPath, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error('tsconfig.json not found');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, join(configPath, '..'));
  return parsed;
}

/**
 * 递归遍历目录，收集符合条件的文件
 * @param dir 目录路径
 * @param isSource 判断文件是否符合条件的函数
 * @param files 已收集的文件列表
 * @returns 所有符合条件的文件路径数组
 */
function walkFiles(dir: string, isSource: (file: string) => boolean, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) {
      // 跳过 node_modules、dist 和隐藏目录
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
      walkFiles(abs, isSource, files);
    } else {
      if (isSource(abs)) files.push(abs);
    }
  }
  return files;
}

/**
 * 判断文件是否为 TypeScript 源文件
 * @param file 文件路径
 * @returns 是否为 .ts 或 .tsx 文件
 */
function isTsSource(file: string): boolean {
  const ext = extname(file);
  return ext === '.ts' || ext === '.tsx';
}

/**
 * 构建文件导入依赖图
 * @param program TypeScript 程序对象
 * @returns 依赖图：文件路径 -> 依赖的文件路径集合
 */
function buildImportGraph(program: ts.Program): Graph {
  const graph: Graph = new Map();

  for (const sourceFile of program.getSourceFiles()) {
    // 跳过 node_modules 中的文件
    if (sourceFile.fileName.includes('/node_modules/')) continue;
    const from = sourceFile.fileName;
    if (!graph.has(from)) graph.set(from, new Set());

    // 辅助：判断标识符是否处于类型位置
    function isInTypePosition(node: ts.Node): boolean {
      let cur: ts.Node | undefined = node;
      while (cur) {
        if (
          ts.isTypeNode(cur) ||
          ts.isTypeAliasDeclaration(cur) ||
          ts.isInterfaceDeclaration(cur) ||
          ts.isHeritageClause(cur) ||
          ts.isImportTypeNode(cur) ||
          ts.isTypeQueryNode(cur)
        ) return true;
        cur = cur.parent;
      }
      return false;
    }

    // 第一步：收集导入绑定（忽略仅类型导入），记录纯副作用导入
    type ImportBinding = { local: string; isNamespace: boolean; targetFile: string };
    const importBindings: ImportBinding[] = [];
    const sideEffectTargets: Set<string> = new Set();

    ts.forEachChild(sourceFile, node => {
      if (!ts.isImportDeclaration(node)) return;
      const spec = node.moduleSpecifier;
      const ic = node.importClause;
      if (!ts.isStringLiteral(spec)) return;

      const resolved = ts.resolveModuleName(spec.text, from, program.getCompilerOptions(), ts.sys);
      const target = resolved.resolvedModule?.resolvedFileName;
      if (!target || target.includes('/node_modules/')) return;

      // 纯副作用导入：import 'x'
      if (!ic) {
        sideEffectTargets.add(target);
        return;
      }

      // 整条 import type ... 忽略
      if (ic.isTypeOnly) return;

      // default import
      if (ic.name) importBindings.push({ local: ic.name.text, isNamespace: false, targetFile: target });

      // named 或 namespace 导入
      if (ic.namedBindings) {
        if (ts.isNamespaceImport(ic.namedBindings)) {
          importBindings.push({ local: ic.namedBindings.name.text, isNamespace: true, targetFile: target });
        } else if (ts.isNamedImports(ic.namedBindings)) {
          for (const el of ic.namedBindings.elements) {
            if (el.isTypeOnly) continue; // import { type A } 忽略
            importBindings.push({ local: el.name.text, isNamespace: false, targetFile: target });
          }
        }
      }
    });

    // 第二步：扫描 AST，只有在“值位置”被实际使用的导入才计入依赖
    const usedTargets = new Set<string>(sideEffectTargets);
    function isInsideImport(node: ts.Node): boolean {
      let cur: ts.Node | undefined = node;
      while (cur) {
        if (
          ts.isImportDeclaration(cur) ||
          ts.isImportClause(cur) ||
          ts.isImportSpecifier(cur) ||
          ts.isNamespaceImport(cur)
        ) return true;
        cur = cur.parent;
      }
      return false;
    }
    function scan(node: ts.Node) {
      if (ts.isIdentifier(node) && !isInTypePosition(node) && !isInsideImport(node)) {
        const name = node.text;
        for (const b of importBindings) {
          if (!b.isNamespace && b.local === name) usedTargets.add(b.targetFile);
        }
      }
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        !isInTypePosition(node) &&
        !isInsideImport(node)
      ) {
        const ns = node.expression.text;
        for (const b of importBindings) {
          if (b.isNamespace && b.local === ns) usedTargets.add(b.targetFile);
        }
      }
      ts.forEachChild(node, scan);
    }
    scan(sourceFile);

    // 第三步：处理 export 声明（忽略 export type）作为运行时依赖
    ts.forEachChild(sourceFile, node => {
      if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        if ((node as ts.ExportDeclaration).isTypeOnly) return;
        const spec = node.moduleSpecifier;
        if (ts.isStringLiteral(spec)) {
          const resolved = ts.resolveModuleName(spec.text, from, program.getCompilerOptions(), ts.sys);
          const resolvedFile = resolved.resolvedModule?.resolvedFileName;
          if (resolvedFile && !resolvedFile.includes('/node_modules/')) {
            usedTargets.add(resolvedFile);
          }
        }
      }
    });

    // 根据使用情况添加依赖边
    if (!graph.has(from)) graph.set(from, new Set());
    for (const target of usedTargets) graph.get(from)!.add(target);
    // 完成
  }

  return graph;
}

/**
 * 从入口文件开始，收集所有可达的文件
 * @param graph 依赖图
 * @param entryFiles 入口文件列表
 * @returns 所有可达的文件路径集合
 */
function collectReachable(graph: Graph, entryFiles: string[]): Set<string> {
  const visited = new Set<string>();
  const stack: string[] = [...entryFiles];
  
  // 使用深度优先搜索遍历依赖图
  while (stack.length) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const deps = graph.get(cur);
    if (deps) for (const d of deps) stack.push(d);
  }
  return visited;
}

/**
 * 主函数：分析并输出未引用的文件
 */
function main() {
  const projectRoot = process.cwd();
  const tsconfigPath = projectRoot;
  const parsed = readTsConfig(tsconfigPath);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });

  // 构建依赖图
  const graph = buildImportGraph(program);

  // 收集所有源文件
  const allSourceFiles = walkFiles(join(projectRoot, 'src'), isTsSource);
  const entryFiles: string[] = [];
  
  // 使用 src/index.ts 作为默认入口文件（如果存在）
  const defaultEntry = join(projectRoot, 'src', 'index.ts');
  if (existsSync(defaultEntry)) entryFiles.push(defaultEntry);
  
  // 将没有入边的 index.ts 文件也作为潜在入口
  for (const f of allSourceFiles) {
    const inbound = [...graph.values()].some(set => set.has(f));
    if (!inbound && f.endsWith('index.ts')) entryFiles.push(f);
  }

  // 收集所有可达的文件
  const reachable = collectReachable(graph, entryFiles);
  const all = new Set(allSourceFiles);
  const unreferenced = [...all].filter(f => !reachable.has(f));

  // 输出结果
  const rel = (p: string) => relative(projectRoot, p);
  if (unreferenced.length === 0) {
    console.log('No unreferenced source files detected.');
  } else {
    console.log('Unreferenced files:');
    for (const f of unreferenced.sort()) {
      console.log(' -', rel(f));
    }
  }
}

// 执行主函数
main();


