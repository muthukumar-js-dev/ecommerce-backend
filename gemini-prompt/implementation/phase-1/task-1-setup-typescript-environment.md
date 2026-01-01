# Phase 1 - Task 1: Setup TypeScript Environment & Tooling

**Duration:** 3-4 days  
**Priority:** Critical (Blocking)  
**Dependencies:** None

---

## Objective

Setup a complete TypeScript development environment with strict type checking, linting, formatting, and build tooling. This is the foundation for the entire TypeScript migration.

---

## Context

The current project is a JavaScript-based Node.js application using:
- Express.js for the web framework
- Webpack for bundling
- Babel for transpilation
- No type checking or strict linting

We need to introduce TypeScript while maintaining the ability to run the existing JavaScript code during the migration period.

---

## Requirements

### 1. TypeScript Installation & Configuration

**Install TypeScript and related dependencies:**
```bash
npm install --save-dev typescript @types/node ts-node ts-node-dev
npm install --save-dev @types/express @types/cors @types/morgan
npm install --save-dev @types/bcrypt @types/jsonwebtoken
npm install --save-dev @types/mongoose
```

**Create `tsconfig.json` in the project root:**

```json
{
  "compilerOptions": {
    // Target & Module
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    
    // Output
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "removeComments": false,
    
    // Strict Type Checking
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    
    // Module Resolution
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@domain/*": ["domain/*"],
      "@application/*": ["application/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@shared/*": ["shared/*"]
    },
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    
    // Advanced
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "**/*.spec.ts"]
}
```

**Create `tsconfig.build.json` for production builds:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false,
    "declaration": false,
    "declarationMap": false,
    "removeComments": true
  },
  "exclude": ["node_modules", "dist", "tests", "**/*.spec.ts", "**/*.test.ts"]
}
```

### 2. ESLint Configuration

**Install ESLint with TypeScript support:**
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev eslint-config-prettier eslint-plugin-prettier
```

**Create `.eslintrc.js` in the project root:**

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // TypeScript specific
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/strict-boolean-expressions': ['error', {
      allowString: false,
      allowNumber: false,
      allowNullableObject: false,
    }],
    
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
  },
  ignorePatterns: ['dist', 'node_modules', '*.js'],
};
```

**Create `.eslintignore`:**
```
dist
node_modules
coverage
*.js
webpack.config.js
```

### 3. Prettier Configuration

**Install Prettier:**
```bash
npm install --save-dev prettier
```

**Create `.prettierrc` in the project root:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "bracketSameLine": false
}
```

**Create `.prettierignore`:**
```
dist
node_modules
coverage
package-lock.json
*.md
```

### 4. Update package.json Scripts

**Add the following scripts to `package.json`:**

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:watch": "tsc -w -p tsconfig.build.json",
    "dev": "ts-node-dev --respawn --transpile-only src/main.ts",
    "start": "node dist/main.js",
    "start:prod": "NODE_ENV=production node dist/main.js",
    
    "lint": "eslint 'src/**/*.ts'",
    "lint:fix": "eslint 'src/**/*.ts' --fix",
    "format": "prettier --write 'src/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts'",
    
    "type-check": "tsc --noEmit",
    "validate": "npm run type-check && npm run lint && npm run format:check",
    
    "clean": "rimraf dist",
    "prebuild": "npm run clean"
  }
}
```

**Install additional dev dependencies:**
```bash
npm install --save-dev rimraf
```

### 5. Create Initial Folder Structure

**Create the following folder structure:**

```
src/
├── domain/
│   └── .gitkeep
├── application/
│   └── .gitkeep
├── infrastructure/
│   ├── database/
│   │   └── .gitkeep
│   ├── http/
│   │   └── .gitkeep
│   └── external-services/
│       └── .gitkeep
├── shared/
│   ├── types/
│   │   └── .gitkeep
│   ├── errors/
│   │   └── .gitkeep
│   ├── utils/
│   │   └── .gitkeep
│   └── constants/
│       └── .gitkeep
└── main.ts
```

**Create a simple `src/main.ts` to verify setup:**

```typescript
import express, { Application, Request, Response } from 'express';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, (): void => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

### 6. Git Configuration

**Update `.gitignore` to include TypeScript artifacts:**

```
# Existing entries
node_modules
.env

# TypeScript
dist
*.tsbuildinfo
*.log

# IDE
.vscode
.idea
*.swp
*.swo

# Testing
coverage
.nyc_output

# OS
.DS_Store
Thumbs.db
```

### 7. VSCode Configuration (Optional but Recommended)

**Create `.vscode/settings.json`:**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Create `.vscode/extensions.json`:**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## Validation Steps

After completing the setup, validate everything works:

### 1. Type Checking
```bash
npm run type-check
```
**Expected:** No errors (main.ts should compile successfully)

### 2. Linting
```bash
npm run lint
```
**Expected:** No errors or warnings

### 3. Formatting
```bash
npm run format:check
```
**Expected:** All files properly formatted

### 4. Build
```bash
npm run build
```
**Expected:** 
- `dist/` folder created
- `dist/main.js` exists
- No compilation errors

### 5. Run Development Server
```bash
npm run dev
```
**Expected:** 
- Server starts on port 3000
- Visit `http://localhost:3000/health`
- Should return: `{"status":"ok","timestamp":"..."}`

### 6. Run Production Build
```bash
npm run build
npm run start
```
**Expected:** 
- Server starts from compiled code
- Health endpoint works

---

## Deliverables

- [ ] TypeScript installed and configured
- [ ] `tsconfig.json` and `tsconfig.build.json` created
- [ ] ESLint configured with TypeScript support
- [ ] Prettier configured
- [ ] All npm scripts working
- [ ] Folder structure created
- [ ] Simple `main.ts` compiles and runs
- [ ] All validation steps pass
- [ ] `.gitignore` updated
- [ ] VSCode settings configured (if using VSCode)

---

## Common Issues & Solutions

### Issue 1: "Cannot find module" errors
**Solution:** Ensure all `@types/*` packages are installed for third-party libraries

### Issue 2: ESLint parsing errors
**Solution:** Verify `parserOptions.project` points to correct `tsconfig.json`

### Issue 3: Path aliases not working
**Solution:** 
- Check `tsconfig.json` `paths` configuration
- For runtime, may need `tsconfig-paths` package

### Issue 4: Build is slow
**Solution:** 
- Use `--transpile-only` flag for development
- Enable `incremental` compilation in tsconfig

---

## Next Steps

After completing this task:
1. Proceed to **Task 2: Create Shared Types & Interfaces**
2. Begin migrating existing JavaScript code incrementally
3. Setup testing infrastructure (Jest with TypeScript)

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig)
- [Node.js TypeScript Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
