---
name: docs-seeker
description: "Searching internet for technical documentation using llms.txt standard, GitHub repositories via Repomix, and parallel exploration. Use when user needs: (1) Latest documentation for libraries/frameworks, (2) Documentation in llms.txt format, (3) GitHub repository analysis, (4) Documentation without direct llms.txt support, (5) Multiple documentation sources in parallel"
version: 2.0.0
---

# Documentation Discovery

Find technical documentation through: **llms.txt** → **Repomix** → **Research**

## Decision Flow

```
1. Try context7.com llms.txt
   ├─ Found → Process URLs with Explorer agents
   └─ Not found ↓
2. Find GitHub repository
   ├─ Found → Use Repomix
   └─ Not found ↓
3. Deploy Researcher agents
```

---

## Method 1: llms.txt (Priority)

### context7.com Patterns

| Source | Pattern |
|--------|---------|
| GitHub repo | `https://context7.com/{org}/{repo}/llms.txt` |
| Website | `https://context7.com/websites/{normalized-path}/llms.txt` |
| Topic search | `...llms.txt?topic={query}` |

**Examples:**
```
github.com/vercel/next.js     → context7.com/vercel/next.js/llms.txt
docs.imgix.com                → context7.com/websites/imgix/llms.txt
shadcn/ui + date picker       → context7.com/shadcn-ui/ui/llms.txt?topic=date
```

### Fallback: WebSearch
```
"[library] llms.txt site:[docs domain]"
```

### Processing URLs

| URL Count | Strategy |
|-----------|----------|
| 1-3 | Single Explorer agent |
| 4-10 | 3-5 Explorer agents |
| 11+ | 5-7 agents in phases |

**Launch all agents in single message** (parallel, not sequential).

---

## Method 2: Repomix

When llms.txt unavailable, analyze GitHub repository directly.

### Quick Commands

```bash
# Remote (recommended - no clone needed)
npx repomix --remote https://github.com/owner/repo

# Docs only
npx repomix --remote [url] --include "docs/**,*.md"

# Source only
npx repomix --remote [url] --include "src/**" --exclude "**/*.test.*"

# Specific version
npx repomix --remote [url] --remote-branch v2.0.0

# With security check
npx repomix --remote [url] --security-check
```

### Key Options

| Option | Purpose |
|--------|---------|
| `--remote [url]` | Analyze without cloning |
| `--remote-branch [ref]` | Specific branch/tag/commit |
| `--include "pattern"` | Only include matching files |
| `--exclude "pattern"` | Skip matching files |
| `--style markdown` | Human-readable output |
| `--security-check` | Scan for secrets |
| `--copy` | Copy to clipboard |

### Language-Specific Patterns

```bash
# JavaScript/TypeScript
--include "src/**,lib/**,*.md" --exclude "node_modules/**,dist/**,*.test.*"

# Python
--include "src/**,*.py,*.md" --exclude "__pycache__/**,venv/**"

# Go
--include "**/*.go,go.mod,*.md" --exclude "vendor/**,*_test.go"

# PHP/Laravel
--include "app/**,config/**,routes/**,*.md" --exclude "vendor/**,storage/**"
```

### Error Handling

| Problem | Solution |
|---------|----------|
| Repo too large | `--include "docs/**,*.md"` |
| Timeout | Clone with `--depth 1`, then local repomix |
| Private repo | Clone with token, then local repomix |
| Not installed | Use `npx repomix` |

---

## Method 3: Research (Fallback)

When no structured docs exist, deploy 3-4 Researcher agents:

1. **Official sources**: Package registry, website, releases
2. **Tutorials**: Blog posts, guides
3. **Community**: Stack Overflow, GitHub discussions
4. **API/Reference**: Auto-generated docs, code examples

---

## Output Format

```markdown
# [Library] Documentation

## Source
- Method: llms.txt / Repomix / Research
- URL: [source]
- Version: [version]
- Date: [date]

## Content
[Organized by topic, not by agent]

## Limitations
[Missing sections, version caveats]
```

---

## Best Practices

1. **context7.com first** - fastest path to documentation
2. **Use ?topic= when applicable** - reduces noise
3. **Parallel agents** - never sequential for 3+ URLs
4. **Verify official sources** - check domain, version, date
5. **Aggregate by topic** - synthesize, don't concatenate
6. **Report methodology** - tell user how you found info
7. **Handle versions explicitly** - don't assume latest
8. **Fail fast** - 30s timeout, then try next method
