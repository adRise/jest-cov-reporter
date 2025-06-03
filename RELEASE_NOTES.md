# Release Notes for v2.1.0

## What's Changed

### Major Improvements
- Complete refactoring from JavaScript to TypeScript
- Modern architecture with separation of concerns:
  - Core modules organized into meaningful directories (diff, threshold, format)
  - Type definitions for coverage metrics, reports, and diffs
  - Parser system with factory pattern for different coverage formats (Jest, Cobertura)

### Code Quality & Organization
- Enhanced code organization with modular class system:
  - `CoverageDiffCalculator`: Calculates differences between coverage reports
  - `ThresholdValidator`: Validates coverage against thresholds
  - `ReportFormatter`: Formats coverage reports for GitHub comments
- Moved constants to separate files for better maintainability
- Improved error handling with proper TypeScript typings
- Better code reusability and maintainability

### Developer Experience
- Comprehensive unit tests for all core components
- TypeScript configuration with strict type checking
- Updated ESLint configuration for TypeScript
- Modern build process with TypeScript compiler

### Documentation
- Updated README with detailed information about features
- Added comprehensive code documentation
- Improved usage examples and option descriptions

This release represents a significant improvement in code quality, maintainability, and type safety while maintaining full compatibility with previous versions. 