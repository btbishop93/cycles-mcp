# Cycles MCP Server

A Model Context Protocol (MCP) server for managing development cycles, tasks, and git workflow across all your repositories.

## Features

- 🔄 **Cycle-based development** - Organize work into time-boxed cycles
- 📝 **Task management** - Create and track tasks with automatic progress updates
- 🎯 **Flexible sizing** - Choose between simple tiers or granular control
- 🔧 **Git integration** - Commit, push, and create PRs directly
- 📊 **Progress tracking** - Automatic progress bars and session logs
- 🔀 **Dependency tracking** - Auto-group tasks for parallel execution
- 👥 **Team coordination** - See which tasks can be done simultaneously
- 📄 **Templates** - Consistent documentation across all projects
- 🤖 **AI-friendly** - Works seamlessly with Cursor and other MCP clients

## Installation

### 1. Install Dependencies

```bash
cd /Users/brenden/Developer/hobby/cycles-mcp
bun install
```

### 2. Build the Server

```bash
bun run build
```

### 3. Configure Cursor

Add this to your Cursor MCP settings (`~/.cursor/mcp.json` or workspace `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cycles": {
      "command": "node",
      "args": ["/Users/brenden/Developer/hobby/cycles-mcp/dist/index.js"]
    }
  }
}
```

### 4. Restart Cursor

Restart Cursor to load the MCP server.

## Usage

### Initialize Workflow in a New Repo

**The AI will prompt you for all required configuration when you initialize:**

```
User: Initialize the cycles workflow for this project
AI: I'll help you set up the workflow. First, let me ask a few questions:
    - What sizing mode do you prefer? (simple/granular)
    - [If simple] What skill tier? (junior/mid/senior)
    - [If granular] What difficulty/duration/detail level?
    - How long should each cycle be? (weeks/months/quarters)
    - How many hours do you have per cycle?
AI: *calls init-workflow with your configuration*
```

**Important:** The AI will ask for configuration before creating the workflow. You must provide:

- Sizing mode (simple or granular)
- Skill level/tier
- Cycle duration and timeframe
- Hours available per cycle

**Simple Mode** (recommended for most users):

```
User: Initialize workflow with simple mode, mid tier, 2 weeks, 16 hours
AI: *calls init-workflow with your settings*
```

**Granular Mode** (for advanced users):

```
User: Initialize workflow with 8h tasks, senior difficulty, low detail level, 1 month, 40 hours
AI: *calls init-workflow with granular settings*
```

**Available Options:**

- **Simple Mode**: Pick a tier

  - `junior` - 1h tasks, high detail (step-by-step)
  - `mid` - 2h tasks, medium detail (balanced)
  - `senior` - 4h tasks, low detail (high-level objectives)

- **Granular Mode**: Specify each:

  - Difficulty: `junior`, `mid`, `senior`
  - Duration: `0.5h`, `1h`, `2h`, `4h`, `8h`
  - Detail: `high`, `medium`, `low`

- **Cycle Duration**:

  - 1-3 weeks
  - 1-2 months
  - 1 quarter (3 months)

- **Hours Per Cycle**: How many hours you can dedicate to the cycle

### Create a Cycle

```
User: Create a new cycle called "Authentication System"
AI: *calls create-cycle*
```

With details:

```
User: Create cycle "API Development" with goal "Build REST API"
AI: *calls create-cycle with description and goal*
```

### Add Tasks to a Cycle

**Basic task:**

```
User: Add task "Setup database schema" to cycle 01
AI: *calls add-task with default settings from config*
```

**With dependencies (for parallelization):**

```
User: Add task "User authentication" to cycle 01, depends on Task 001
AI: *calls add-task with dependencies, automatically groups tasks*
```

**With full metadata:**

```
User: Add task "Implement OAuth" to cycle 01:
- Depends on: Task 001, Task 002
- Conflicts with: None
- Modifies: src/auth/, database users table
- Duration: 8h, senior difficulty
AI: *calls add-task with full metadata*
```

**Why specify dependencies?**

- Tasks are automatically grouped into parallel execution groups
- Teams can see which tasks can be done simultaneously
- LLM agents can work on different groups without conflicts
- Cycle README shows clear visual grouping: 🟢 Group 1 (start now), 🟡 Group 2 (after Group 1), etc.

### Working on a Task

**1. Commit Your Work**

```
User: Commit this with message "add user model"
AI: *calls commit-task*
```

With detailed body:

```
User: Commit "add user model" with details about validation logic
AI: *calls commit-task with body*
```

**2. Push Your Branch**

```
User: Push this branch
AI: *calls push-branch*
```

**3. Create a Pull Request**

```
User: Create PR for task 001 "Setup database"
AI: *calls create-pr, automatically marks task complete*
```

### Track Progress

```
User: Update progress for cycle 01, mark task 002 complete
AI: *calls update-progress*
```

Log a session:

```
User: Log session for today, worked 2 hours on task 003
AI: *calls update-progress with session details*
```

## Available Tools

| Tool              | Description                                    |
| ----------------- | ---------------------------------------------- |
| `init-workflow`   | Initialize cycle workflow in a repository      |
| `create-cycle`    | Create a new development cycle                 |
| `add-task`        | Add a task to a cycle                          |
| `commit-task`     | Commit changes with conventional commit format |
| `push-branch`     | Push current branch to remote                  |
| `create-pr`       | Create pull request and mark task complete     |
| `update-progress` | Update cycle progress and log sessions         |

## Available Resources

| Resource                  | Description           |
| ------------------------- | --------------------- |
| `template://workflow`     | WORKFLOW.md template  |
| `template://cycles`       | cycles.md template    |
| `template://cycle-readme` | Cycle README template |
| `template://task`         | Task file template    |
| `template://pr`           | Pull request template |

## Workflow Overview

### 1. Initialize (Once Per Repo)

**IMPORTANT:** This must be done first! All other tools validate that initialization is complete.

```
init-workflow → creates:
  - .cycles-config.json (configuration)
  - WORKFLOW.md (workflow guide)
  - docs/cycles.md (cycles tracker)
  - docs/cycles/ (cycles directory)
  - .github/pull_request_template.md (PR template)
```

Without proper initialization, other tools will return an error listing missing files.

### 2. Create Cycle

```
create-cycle → creates docs/cycles/01-cycle-name/README.md
```

### 3. Add Tasks

```
add-task → creates docs/cycles/01-cycle-name/001-task-name.md
add-task → creates docs/cycles/01-cycle-name/002-task-name.md
...
→ Automatically updates cycle README with task dependencies
→ Groups tasks for parallel execution
```

**Task Dependency Grouping:**

- Tasks with no dependencies → 🟢 Group 1 (start immediately)
- Tasks depending on Group 1 → 🟡 Group 2 (parallel after Group 1)
- Tasks depending on Group 2 → 🟡 Group 3 (parallel after Group 2)
- Final integration tasks → 🔴 Final Group

Tasks within the same group can be worked on simultaneously!

### 4. Work on Tasks

```
# For each task:
1. Create branch: feat/cycle-01-task-001-description
2. Work and commit incrementally (commit-task)
3. Push branch (push-branch)
4. Create PR (create-pr) → auto-marks task complete
5. Repeat for next task
```

### 5. Track Progress

Progress updates automatically when PRs are created. You can also manually update:

```
update-progress → marks tasks complete, updates progress bars
```

## Configuration

Each repository has a `.cycles-config.json` file:

```json
{
  "sizing_mode": "simple",
  "simple_tier": "mid",
  "cycle_duration": {
    "unit": "weeks",
    "value": 2
  },
  "hours_per_cycle": 16
}
```

Or granular:

```json
{
  "sizing_mode": "granular",
  "difficulty": "senior",
  "task_duration": "4h",
  "detail_level": "low",
  "cycle_duration": {
    "unit": "months",
    "value": 1
  },
  "hours_per_cycle": 40
}
```

## Examples

### Example 1: Quick Start (Simple Mode)

```
User: Initialize cycles workflow with mid tier
AI: Creates structure, uses 2h tasks with medium detail

User: Create cycle "User Management"
AI: Creates cycle 01

User: Add tasks for signup, login, and profile
AI: Creates 3 tasks, each ~2h

User: (work on task 001, then...)
User: Commit "implement signup form"
AI: Commits with conventional format

User: Create PR for task 001
AI: Creates PR, marks task complete
```

### Example 2: Senior Developer (Granular Mode)

```
User: Initialize workflow with 8h tasks, senior difficulty, low detail
AI: Creates structure for experienced devs

User: Create cycle "Microservices Architecture"
AI: Creates cycle 01

User: Add task "Design service boundaries"
AI: Creates high-level task with minimal hand-holding

User: (work on task, then...)
User: Create PR for task 001
AI: Creates PR with your changes
```

### Example 3: Part-Time Contributor

```
User: Initialize workflow with junior tier, 1 week cycles, 8 hours per cycle
AI: Creates structure with 8 1-hour tasks per cycle

User: Create cycle "Bug Fixes"
AI: Creates cycle with appropriate size

User: Add 8 small bug fix tasks
AI: Creates detailed, 1-hour tasks
```

### Example 4: Team with Parallel Work

```
User: Initialize workflow for team collaboration
AI: Sets up structure

User: Create cycle "E-commerce Platform"
AI: Creates cycle 01

User: Add tasks:
1. "Setup database" - no dependencies
2. "Create product API" - depends on Task 001
3. "Design UI components" - no dependencies
4. "Build shopping cart" - depends on Task 002, 003
5. "Payment integration" - depends on Task 004

AI: Creates tasks and groups them automatically in cycle README:

🟢 Group 1 (Start Immediately):
- [ ] 001 - Setup database
- [ ] 003 - Design UI components

🟡 Group 2 (After Group 1):
- [ ] 002 - Create product API (needs 001)

🟡 Group 3 (After Group 2):
- [ ] 004 - Build shopping cart (needs 002, 003)

🔴 Group 4 (Final Tasks):
- [ ] 005 - Payment integration (needs 004)

> Parallelization tip: Tasks within the same group can be worked on simultaneously
```

**Result:**

- Two devs can work on tasks 001 and 003 simultaneously
- Once done, one dev starts 002 while another works on docs
- Tasks 004 becomes available after 002 and 003 complete
- Clear visibility for the whole team!

## Git Workflow Integration

The MCP server follows these conventions:

### Branch Naming

```
feat/cycle-XX-task-YYY-description
```

Example: `feat/cycle-01-task-001-setup-database`

### Commit Messages

```
<type>(cycle-XX): <description>

[optional body]
```

Example: `feat(cycle-01): add user authentication`

### Pull Requests

- Title: `feat(cycle-XX): Task description`
- Body: Auto-generated from PR template
- Automatically marks task as complete when created

## Development

### Run in Dev Mode

```bash
bun run dev
```

### Type Check

```bash
bun run type-check
```

### Build

```bash
bun run build
```

## Troubleshooting

### Server Not Showing in Cursor

1. Check MCP settings file is valid JSON
2. Ensure path to `dist/index.js` is correct
3. Restart Cursor completely
4. Check Cursor logs for errors

### Tools Not Working

1. Ensure `init-workflow` was run first
2. All tools will validate that the workflow is properly initialized before running
3. Required files: `.cycles-config.json`, `WORKFLOW.md`, `docs/cycles.md`, `docs/cycles/`, `.github/pull_request_template.md`
4. If you see "Missing files" error, run `init-workflow` to set up the complete structure
5. Verify you're in the correct directory
6. Check file permissions

### PR Creation Fails

The MCP server tries to use GitHub CLI (`gh`) to create PRs. If it's not installed:

1. Install GitHub CLI: `brew install gh`
2. Authenticate: `gh auth login`
3. Or manually create PRs using the provided template

## Philosophy

This MCP server is based on a **love it or hate it** philosophy:

- **No customization** - Templates are fixed for consistency
- **Opinionated workflow** - One way to do things, done well
- **Automatic tracking** - Progress updates automatically
- **AI-first** - Designed for natural language interaction

If you need customization, fork and modify. Otherwise, embrace the structure and enjoy the productivity boost!

## License

MIT

## Contributing

Issues and PRs welcome! This is a hobby project but maintained actively.

## Credits

Created for managing development cycles across multiple repositories. Inspired by agile sprints, but optimized for solo developers and small teams.
