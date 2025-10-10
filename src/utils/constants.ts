import { CoverageTypeConfig } from '../types';

export const ICONS = {
  INCREASED_COVERAGE: ':green_circle:',
  DECREASED_COVERAGE: ':red_circle:',
  NEW_COVERAGE: ':new:',
  REMOVED_COVERAGE: ':yellow_circle:',
  SPARKLE: ':sparkles:'
};

export const STATUS_BY_COVERAGE_TYPE: Record<string, CoverageTypeConfig> = {
  jest: {
    // Metrics and headers must correspond one-to-one
    // 'statements' correspond to 'Stmts'
    statusHeaders: ['Stmts', 'Branch', 'Funcs', 'Lines'],
    statusMetrics: ['statements', 'branches', 'functions', 'lines'],
    summaryMetric: 'lines',
  },
  cobertura: {
    statusHeaders: ['Stmts', 'Branch', 'Funcs'],
    statusMetrics: ['statements', 'branches', 'functions'],
    summaryMetric: 'lines',
  },
};

export const COMMENT_IDENTIFIER = `<!-- codeCoverageDiffComment -->`;
export const MAX_COMMENT_LINES = 500; 