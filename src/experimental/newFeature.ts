/**
 * 实验性新功能
 * 还在开发中，暂时未被使用
 */

export interface NewFeatureConfig {
  enabled: boolean;
  options: string[];
}

export class NewFeature {
  private config: NewFeatureConfig;

  constructor(config: NewFeatureConfig) {
    this.config = config;
  }

  execute(): void {
    if (this.config.enabled) {
      console.log('New feature is running');
    }
  }
}
