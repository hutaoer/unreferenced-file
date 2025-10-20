import * as ts from "typescript";
const configPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");
const config = ts.readConfigFile(configPath!, ts.sys.readFile);
const compilerOptions = ts.parseJsonConfigFileContent(config.config, ts.sys, "./").options;
const program = ts.createProgram({
  rootNames: [],
  options: compilerOptions,
});