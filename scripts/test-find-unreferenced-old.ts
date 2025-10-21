import * as path from 'path';
import { existsSync } from 'fs';
import UnusedFilesPlugin, { UnusedFilesPluginOptions } from './find-unreferenced-old';

// 简单的 CLI 运行器：不依赖 webpack，仅通过插件的扫描能力演示“未使用文件”列表
(async function run() {
  const root = process.cwd();

  const options: UnusedFilesPluginOptions = {
    root,
    include: ['src/**/*'],
    exclude: [],
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    verbose: false,
    checkTypeReferences: true,
    // treatTypeOnlyAsUnused: true,
    // strictRuntimeUsage: true,
    tsconfigPath: 'tsconfig.json',
    writeDisk: false,
    name: 'unused-files.json'
  };

  const plugin = new (UnusedFilesPlugin as any)(options) as UnusedFilesPlugin & {
    files: Set<string>;
    unusedFiles: string[];
    typeReferencedFiles: Set<string>;
  };

  // 在无 webpack 环境下，默认入口：如果存在 src/index.ts，将其视为入口
  const entryFiles = new Set<string>();
  const defaultEntry = path.resolve(root, 'src', 'index.ts');
  if (existsSync(defaultEntry)) entryFiles.add(defaultEntry);
  const usedFiles = new Set<string>();

  const unused: string[] = [];
  plugin.files.forEach((file) => {
    const isEntry = entryFiles.has(file);
    const isUsed = usedFiles.has(file);
    const isTypeReferenced = plugin.typeReferencedFiles.has(file);

    const isReferenced = isUsed || (!options.treatTypeOnlyAsUnused && isTypeReferenced);
    if (!isEntry && !isReferenced) unused.push(file);
  });

  if (unused.length === 0) {
    console.log('No unreferenced files (by this lightweight test harness).');
    return;
  }

  console.log(`Unreferenced files (lightweight harness): ${unused.length}`);
  for (const f of unused.sort()) {
    console.log(' -', path.relative(root, f));
  }
})();
