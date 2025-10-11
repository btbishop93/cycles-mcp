# Development Cycles

This document tracks all development cycles for this project. Each cycle is designed to deliver meaningful progress toward project goals.

> **📖 New to the workflow?** Read the **[Workflow Guide](../WORKFLOW.md)** to learn how to work with cycles, tasks, branches, and pull requests.

## Overview

**Current Cycle**: {{CURRENT_CYCLE}}  
**Total Cycles Planned**: {{TOTAL_CYCLES}}  
**Completed**: 0 hours (0%)

## Cycle Structure

```
/docs/cycles/
  /01-cycle-name/    ○ Not Started
  /02-cycle-name/    ○ Planned
  /03-cycle-name/    ○ Planned
```

## Cycles

_Cycles will be listed here as they are created_

## Progress Tracking

### Overall Progress

```
Cycle 01: [░░░░░░░░░░] 0 tasks
Cycle 02: [░░░░░░░░░░] Planned
Cycle 03: [░░░░░░░░░░] Planned
```

### Time Investment

| Cycle     | Estimated | Actual | Variance |
| --------- | --------- | ------ | -------- |
| 01        | -         | -      | -        |
| **Total** | **-**     | **-**  | **-**    |

## Working on a Cycle

> **Important**: Follow the [Workflow Guide](../WORKFLOW.md) for the complete git workflow including feature branches and pull requests.

### Starting a New Cycle

1. Navigate to the cycle directory: `cd docs/cycles/0X-cycle-name/`
2. Read the cycle README thoroughly
3. Create a feature branch: `git checkout -b feat/cycle-0X-task-001-description`
4. Start with task 001
5. Follow the task instructions
6. Open a PR when complete
7. Progress updates automatically after merge

### Completing a Task

1. Check all acceptance criteria
2. Run all tests in "Testing Your Work"
3. **Push branch and open a Pull Request**
4. After PR is merged:
   - Task automatically marked complete
   - Progress bar updates automatically
   - Log session in session log
5. Move to next task

**See [WORKFLOW.md](../WORKFLOW.md) for detailed PR process.**

### Completing a Cycle

1. Verify all success criteria met
2. Run end-to-end tests
3. Update cycle status to "Complete"
4. Update this file's progress tracker
5. Celebrate! 🎉
6. Plan next cycle if needed

## Commit Message Format

Following conventional commits:

```
<type>(cycle-XX): <description>

[optional body]

[optional footer]
```

**Examples**:

- `feat(cycle-01): setup project structure`
- `feat(cycle-01): implement user authentication`
- `fix(cycle-01): correct validation logic`
- `docs(cycle-01): update task 003 acceptance criteria`
- `chore(cycle-01): complete cycle 01`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

## Staying on Track

**Check-in Questions**:

- [ ] Am I on track to complete the cycle in the allocated time?
- [ ] Are any tasks taking significantly longer than expected?
- [ ] Do I need to adjust the scope or break tasks down further?
- [ ] Have I committed my work regularly?
- [ ] Am I blocked on anything?

**Motivation Tips**:

- 🎯 Focus on one task at a time
- ⏱️ Use timeboxes based on task duration
- ✅ Check off tasks frequently for quick wins
- 📝 Keep notes of learnings and blockers
- 🎉 Celebrate completing each cycle
- 🚀 Ship working features incrementally

## Notes

_Use this space for overall project notes and learnings_

---

**Last Updated**: {{DATE}}  
**Next Review**: After completing Cycle 01

