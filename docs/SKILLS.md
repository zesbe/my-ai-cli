# Skills System - Extend Your AI

Skills are reusable modules that teach your AI new capabilities. They work like plugins - load them when needed, unload when done.

## Quick Start

### List Available Skills
```bash
/skills
```
Shows all skills in `~/.zesbe/skills/` and `.skills/`

### Load a Skill
```bash
/skills load skill-name
```
Loads the skill into the AI's context. The AI will follow the skill's instructions.

### Unload a Skill
```bash
/skills unload skill-name
```
Removes the skill from context.

### View Loaded Skills
```bash
/skills loaded
```
Shows currently active skills.

### Create a New Skill
```bash
/skills create my-skill
```
Creates a template in `~/.zesbe/skills/my-skill/`

### Refresh Skill List
```bash
/skills refresh
```
Rescans skill directories.

## Skill Structure

Each skill is a directory containing a `SKILL.md` file:

```
~/.zesbe/skills/
  └── my-skill/
      ├── SKILL.md          (required)
      ├── examples.txt      (optional)
      └── reference.json    (optional)
```

### SKILL.md Format

```markdown
---
name: My Skill
description: Brief description of what this skill does
---

# Skill Name

## When to use this skill
Describe scenarios when the AI should use this skill...

## Instructions
Step-by-step instructions for the AI:

1. First do this...
2. Then do that...
3. Finally...

## Examples

### Example 1: Task Name
```bash
# Example commands
```

## Important Notes
- Any gotchas or warnings
- Best practices
```

## Example Skills

### Example 1: Git Workflow Skill

Create: `/skills create git-workflow`

Edit `~/.zesbe/skills/git-workflow/SKILL.md`:

```markdown
---
name: Git Workflow
description: Standard git workflow with conventional commits
---

# Git Workflow Skill

## When to use this skill
When committing code changes, creating branches, or managing git repositories.

## Instructions

### Committing Changes
1. Review changes with `git status` and `git diff`
2. Stage files: `git add <files>`
3. Use conventional commit format:
   - `feat: Add new feature`
   - `fix: Fix bug`
   - `docs: Update documentation`
   - `refactor: Refactor code`
   - `test: Add tests`
4. Include descriptive body if needed
5. Always add co-author: `Co-Authored-By: Letta <noreply@letta.com>`

### Creating Branches
1. Use descriptive names: `feature/new-feature`, `fix/bug-name`
2. Branch from main/master
3. Keep branches focused on single tasks

## Examples

### Example Commit
```bash
git add src/feature.js
git commit -m "feat: Add user authentication

Implemented JWT-based authentication with refresh tokens.
Added login and logout endpoints.

Co-Authored-By: Letta <noreply@letta.com>"
```

### Example Branch
```bash
git checkout -b feature/add-search
# Make changes
git commit -m "feat: Add search functionality"
git push -u origin feature/add-search
```
```

Load it: `/skills load git-workflow`

Now the AI will follow this workflow automatically!

### Example 2: Code Review Skill

Create: `/skills create code-review`

```markdown
---
name: Code Review
description: Thorough code review checklist
---

# Code Review Skill

## When to use this skill
When reviewing code changes, pull requests, or analyzing code quality.

## Review Checklist

### 1. Functionality
- Does the code work as intended?
- Are edge cases handled?
- Are errors handled gracefully?

### 2. Code Quality
- Is the code readable and maintainable?
- Are variable/function names descriptive?
- Is there duplicate code that should be refactored?
- Are functions small and focused?

### 3. Performance
- Are there obvious performance issues?
- Are there N+1 queries or inefficient loops?
- Is data fetching optimized?

### 4. Security
- Are inputs validated?
- Are SQL queries parameterized?
- Are secrets hardcoded? (BAD!)
- Is authentication/authorization correct?

### 5. Testing
- Are tests included?
- Do tests cover edge cases?
- Are tests meaningful?

### 6. Documentation
- Are complex parts commented?
- Is the README updated?
- Are breaking changes documented?

## Output Format

Provide feedback as:
✅ Good: [what's good]
⚠️ Warning: [potential issues]
❌ Issue: [problems to fix]
💡 Suggestion: [improvements]
```

### Example 3: API Design Skill

```markdown
---
name: RESTful API Design
description: Best practices for RESTful API design
---

# RESTful API Design Skill

## Principles

### 1. Resource Naming
- Use nouns, not verbs: `/users` not `/getUsers`
- Use plurals: `/users` not `/user`
- Use hierarchies: `/users/{id}/posts`

### 2. HTTP Methods
- GET: Retrieve resources
- POST: Create resources
- PUT: Update entire resource
- PATCH: Partial update
- DELETE: Remove resource

### 3. Status Codes
- 200: Success
- 201: Created
- 204: No content
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

### 4. Response Format
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  },
  "errors": []
}
```

### 5. Versioning
Use URL versioning: `/api/v1/users`

### 6. Filtering & Pagination
- Filter: `?status=active&role=admin`
- Paginate: `?page=2&limit=20`
- Sort: `?sort=-created_at` (- for desc)

## Examples

### Good API Design
```
GET    /api/v1/users                 List users
GET    /api/v1/users/:id             Get user
POST   /api/v1/users                 Create user
PUT    /api/v1/users/:id             Update user
DELETE /api/v1/users/:id             Delete user
GET    /api/v1/users/:id/posts       User's posts
```

### Bad API Design (DON'T DO THIS)
```
❌ GET /getUserById?id=123
❌ POST /createUser
❌ GET /user (singular)
❌ GET /api/users?action=delete (use DELETE)
```
```

## Skill Directories

### User Skills (~/.zesbe/skills/)
Global skills available to all projects.

### Project Skills (.skills/)
Project-specific skills. Add to `.gitignore` or commit to share with team.

## Best Practices

### 1. Keep Skills Focused
Each skill should teach ONE thing well.

### 2. Provide Examples
Always include code examples in skills.

### 3. Update Regularly
Maintain and improve skills over time.

### 4. Share with Team
Commit `.skills/` to git for team consistency.

### 5. Use Descriptive Names
`git-workflow` not `skill1`

## Tips

- Load multiple skills: They combine in AI context
- Unload unused skills: Saves context space
- Create skills for:
  - Coding standards
  - Testing patterns
  - Documentation formats
  - Deployment procedures
  - Code review checklists
  - Troubleshooting guides

## Advanced: Dynamic Skills

Add additional files to skill directories:

```
my-skill/
  ├── SKILL.md
  ├── templates/
  │   ├── component.tsx
  │   └── test.spec.ts
  └── config/
      └── eslint.json
```

Reference them in SKILL.md:
```markdown
## Templates
See `templates/component.tsx` for component structure.
```

The AI can read these files using the `read` tool!

---

Built with ❤️ for the Zesbe CLI
