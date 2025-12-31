# 🚀 TypeScript Migration + Phase 3 Features

**Goal:** Migrate Zesbe CLI from JavaScript to TypeScript + Add advanced coding features

**Status:** 🟡 IN PROGRESS

---

## 📊 PROGRESS TRACKER

### ✅ Phase 0: Setup (DONE)
- [x] Install TypeScript + dependencies
- [x] Create tsconfig.json
- [x] Update package.json scripts
- [x] Create type definitions (`src/types/index.ts`)
- [x] Setup build system

### 🔄 Phase 1: Core Migration (IN PROGRESS)
**Priority:** High | **Estimated:** 3-4 hours

#### Files to Migrate:
- [ ] `src/types/index.ts` ✅ (Created)
- [ ] `src/tools/index.ts` (Core tool registry)
- [ ] `src/agent.ts` (Main agent logic)
- [ ] `src/config.ts` (Configuration)
- [ ] `src/models-db.ts` (Model database)
- [ ] `src/provider-info.ts` (Provider info)

#### Individual Tools:
- [ ] `src/tools/bash.ts`
- [ ] `src/tools/read.ts`
- [ ] `src/tools/write.ts`
- [ ] `src/tools/edit.ts`
- [ ] `src/tools/glob.ts`
- [ ] `src/tools/grep.ts`
- [ ] `src/tools/web.ts`

### 🔄 Phase 2: Feature Modules (PENDING)
**Priority:** High | **Estimated:** 4-5 hours

#### Skills System:
- [ ] `src/skills/manager.ts`
- [ ] `src/skills/types.ts`

#### MCP System:
- [ ] `src/mcp/client.ts`
- [ ] `src/mcp/marketplace.ts`
- [ ] `src/mcp/types.ts`

### 🔄 Phase 3: CLI & UI (PENDING)
**Priority:** Medium | **Estimated:** 3-4 hours

- [ ] `src/index.ts` (Entry point)
- [ ] `src/cli.ts` (Classic CLI)
- [ ] `src/ink-cli.tsx` (Ink UI)
- [ ] `src/ui/welcome.ts`

### 🆕 Phase 4: NEW FEATURES (Phase 3 Implementation)
**Priority:** High | **Estimated:** 6-8 hours

#### 1. Piping Support ⚡ (2-3 hours)
**Status:** 🔴 TODO

**Goal:** Enable piping from other commands
```bash
cat error.log | zesbe "analyze this error"
git diff | zesbe "review these changes"
npm test 2>&1 | zesbe "explain test failures"
```

**Files to Create:**
- [ ] `src/piping/stdin-handler.ts` - Handle stdin input
- [ ] `src/piping/parser.ts` - Parse piped content
- [ ] `src/piping/context-builder.ts` - Build context from pipe

**Implementation:**
```typescript
// src/piping/stdin-handler.ts
export async function handleStdin(): Promise<PipedInput | null> {
  if (process.stdin.isTTY) return null;
  
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  
  return {
    content: Buffer.concat(chunks).toString('utf-8'),
    timestamp: new Date()
  };
}
```

**Update index.ts:**
```typescript
// Check for piped input
const pipedInput = await handleStdin();
if (pipedInput) {
  const prompt = args[0] || "Analyze this input";
  initialPrompt = `${prompt}\n\nInput:\n\`\`\`\n${pipedInput.content}\n\`\`\``;
}
```

---

#### 2. Code Templates System 📝 (2-3 hours)
**Status:** 🔴 TODO

**Goal:** Generate code from templates
```bash
zesbe template create react-component Button
zesbe template create api-endpoint /users
zesbe template create test UserService
```

**Files to Create:**
- [ ] `src/templates/manager.ts` - Template manager
- [ ] `src/templates/generator.ts` - Code generator
- [ ] `src/templates/built-in/` - Built-in templates
  - [ ] `react-component.ts`
  - [ ] `api-endpoint.ts`
  - [ ] `test-suite.ts`
  - [ ] `git-workflow.ts`

**Template Structure:**
```typescript
// src/templates/types.ts
export interface Template {
  id: string;
  name: string;
  description: string;
  language: string;
  files: TemplateFile[];
  variables: TemplateVariable[];
}

// Example: React Component Template
const reactComponent: Template = {
  id: 'react-component',
  name: 'React Component',
  description: 'Functional React component with TypeScript',
  language: 'typescript',
  files: [
    {
      path: '{{name}}.tsx',
      content: `
import React from 'react';

interface {{name}}Props {
  // Add props here
}

export const {{name}}: React.FC<{{name}}Props> = (props) => {
  return (
    <div className="{{name}}">
      {/* Component content */}
    </div>
  );
};
      `.trim()
    },
    {
      path: '{{name}}.test.tsx',
      content: `
import { render } from '@testing-library/react';
import { {{name}} } from './{{name}}';

describe('{{name}}', () => {
  it('renders correctly', () => {
    const { container } = render(<{{name}} />);
    expect(container).toBeInTheDocument();
  });
});
      `.trim()
    }
  ],
  variables: [
    {
      name: 'name',
      description: 'Component name',
      required: true
    }
  ]
};
```

**Commands:**
```bash
/template list               # List available templates
/template create <id> <name> # Generate from template
/template add <path>         # Add custom template
```

---

#### 3. GitHub Actions Integration 🔧 (2-3 hours)
**Status:** 🔴 TODO

**Goal:** Run Zesbe in CI/CD for code review
```yaml
# .github/workflows/ai-review.yml
name: AI Code Review
on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install Zesbe
        run: npm install -g @zesbe/cli
      
      - name: AI Code Review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          git diff origin/${{ github.base_ref }}..HEAD | \
          zesbe "Review this PR and provide feedback" \
          --output pr-review.md
      
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('pr-review.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: review
            });
```

**Files to Create:**
- [ ] `src/ci/github-actions.ts` - GitHub Actions integration
- [ ] `src/ci/pr-reviewer.ts` - PR review logic
- [ ] `src/ci/output-formatter.ts` - Format output for PR comments

**Features:**
- Automatic PR reviews
- Code quality checks
- Test coverage analysis
- Security vulnerability detection
- Commit message validation

**Environment Variables:**
```bash
GITHUB_TOKEN        # GitHub API token
GITHUB_REPOSITORY   # repo owner/name
GITHUB_PR_NUMBER    # PR number
GITHUB_SHA          # Commit SHA
```

---

## 🎯 PRIORITY ORDER

### Week 1: Core Migration
1. Setup ✅
2. Type definitions ✅
3. Core files (agent, tools, config)
4. Test compilation

### Week 2: Feature Modules
1. Skills system migration
2. MCP system migration
3. CLI migration

### Week 3: Phase 3 Features
1. **Piping Support** ⚡ (Quick win!)
2. **Templates System** 📝 (High value)
3. **GitHub Actions** 🔧 (CI/CD integration)

---

## 🔧 DEVELOPMENT WORKFLOW

### During Migration:
```bash
# 1. Migrate a file
mv src/agent.js src/agent.ts

# 2. Add type annotations
# (manually edit file)

# 3. Test compilation
npm run build

# 4. Test functionality
npm run dev

# 5. Commit
git add src/agent.ts
git commit -m "♻️ Migrate agent.js to TypeScript"
```

### For New Features:
```bash
# 1. Create types first
vim src/piping/types.ts

# 2. Implement
vim src/piping/stdin-handler.ts

# 3. Test
npm run build && npm run dev

# 4. Integrate
# Update src/index.ts

# 5. Document
# Update docs/

# 6. Commit
git commit -m "✨ Add piping support"
```

---

## 📝 TESTING CHECKLIST

### After Each Migration:
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `zesbe --help` works
- [ ] Basic commands work (`/help`, `/model`, `/provider`)
- [ ] Tools work (bash, read, write, edit)
- [ ] Skills load correctly
- [ ] MCP servers connect

### After Phase 3 Features:
- [ ] Piping: `echo "test" | zesbe "analyze"`
- [ ] Templates: `zesbe template create react-component Test`
- [ ] GitHub Actions: Test workflow runs
- [ ] All existing features still work
- [ ] No regressions

---

## 🐛 KNOWN ISSUES & SOLUTIONS

### Issue 1: Import Path Resolution
**Problem:** TypeScript can't resolve `.js` extensions
**Solution:** Use `.ts` extensions in imports during migration

### Issue 2: CommonJS vs ESM
**Problem:** Some packages use CommonJS
**Solution:** Use `esModuleInterop: true` in tsconfig.json

### Issue 3: Type Inference
**Problem:** `any` types everywhere
**Solution:** Add explicit types gradually, use `unknown` for uncertain types

### Issue 4: Ink + TypeScript
**Problem:** Ink's JSX requires special setup
**Solution:** 
- Rename `ink-cli.js` → `ink-cli.tsx`
- Add `"jsx": "react"` to tsconfig.json
- Import React: `import React from 'react'`

---

## 📚 RESOURCES

### TypeScript Guides:
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Migration Examples:
- [Chalk migration](https://github.com/chalk/chalk/pull/556)
- [Commander.js types](https://github.com/tj/commander.js/tree/master/types)

### Phase 3 References:
- [Node.js stdin](https://nodejs.org/api/process.html#process_process_stdin)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Template Engines](https://handlebarsjs.com/)

---

## 🎉 SUCCESS CRITERIA

### Migration Complete When:
✅ All 19 .js files → .ts files
✅ Zero TypeScript errors
✅ All tests pass
✅ Documentation updated
✅ npm package builds successfully

### Phase 3 Complete When:
✅ Piping works: `cat file | zesbe "prompt"`
✅ Templates work: `zesbe template create <type> <name>`
✅ GitHub Actions example workflow
✅ All features documented
✅ README updated

---

## 🚀 NEXT STEPS

**Immediate (This Session):**
1. ✅ Setup TypeScript
2. ✅ Create type definitions
3. 🔄 Migrate 2-3 core files (proof of concept)
4. 🔄 Implement piping support (Phase 3 feature #1)
5. Commit & push progress

**Next Session:**
1. Continue core file migration
2. Migrate tools one by one
3. Add templates system
4. Add GitHub Actions integration
5. Full testing & documentation

---

**Estimated Total Time:** 20-25 hours
**Sessions Needed:** 3-4 sessions

**Current Status:** ✅ Setup complete, ready for migration!
