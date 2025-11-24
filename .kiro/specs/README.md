# MITA State Self-Assessment Tool - Specifications

This folder contains feature specifications following the spec-driven development methodology. Each spec includes requirements, design, and implementation tasks.

## Folder Structure

### Archive Folders

- **archived-done/** - Completed and deployed features (preserved for reference)
- **archived-on-hold/** - Deprioritized or superseded features

## Spec Structure

Each specification folder contains:
- `requirements.md` - User stories and acceptance criteria (EARS format)
- `design.md` - Architecture, components, and correctness properties
- `tasks.md` - Implementation plan with actionable tasks

## Development Workflow

1. **Requirements** - Define user stories and acceptance criteria
2. **Design** - Create architecture and correctness properties
3. **Tasks** - Break down implementation into discrete steps
4. **Implementation** - Execute tasks incrementally
5. **Archive** - Move completed specs to archived-done/

## Related Documentation

- [ROADMAP.md](../../ROADMAP.md) - Project roadmap and priorities
- [CHANGELOG.md](../../CHANGELOG.md) - Version history
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines

## Archive Policy

**Move to archived-done/** when:
- All implementation tasks are completed
- Features are deployed to production
- No outstanding bugs or issues remain
- Documentation is updated

**Move to archived-on-hold/** when:
- Feature was planned but not started
- Feature has been deprioritized
- Feature is waiting for external dependencies
- Feature has been superseded by other work
