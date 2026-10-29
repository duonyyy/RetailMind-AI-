import * as fs from 'fs';
import * as path from 'path';

describe('Enterprise Architecture Boundaries (Foodee Gem #1)', () => {
  const featuresRoot = path.resolve(__dirname, '../features');
  const sharedRoot = path.resolve(__dirname, '../shared');

  function getAllTsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('should enforce that cross-feature imports strictly go through public-api.ts', () => {
    const featureDirs = fs
      .readdirSync(featuresRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const violations: string[] = [];

    for (const featureName of featureDirs) {
      const featureDir = path.join(featuresRoot, featureName);
      const files = getAllTsFiles(featureDir);

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const importRegex = /from\s+['"]([^'"]+)['"]/g;
        let match: RegExpExecArray | null;

        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          // Check if importing another feature via relative path
          for (const otherFeature of featureDirs) {
            if (otherFeature === featureName) continue;
            const pattern = new RegExp(`\\.\\./${otherFeature}/(?!public-api$)`);
            if (pattern.test(importPath)) {
              violations.push(
                `${path.relative(featuresRoot, file)} imports internal path "${importPath}" of feature "${otherFeature}" instead of "../${otherFeature}/public-api"`,
              );
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('should prohibit forwardRef() across all features to prevent circular dependencies', () => {
    const files = getAllTsFiles(featuresRoot);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('forwardRef(')) {
        violations.push(`${path.relative(featuresRoot, file)} uses prohibited forwardRef()`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('should strictly prohibit shared/ from importing from features/ (Clean Shared Layer)', () => {
    const files = getAllTsFiles(sharedRoot);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const importRegex = /from\s+['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.includes('features/')) {
          violations.push(
            `${path.relative(sharedRoot, file)} illegally imports from features ("${importPath}"). Shared layer must be independent!`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
