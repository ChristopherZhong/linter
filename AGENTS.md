# Agent Rules

As an AI agent working on this codebase, please adhere to the following rules:

1. **Maintain Quality**: Ensure all TypeScript code is strictly typed.
2. **Web Components**: Use Lit for building UI components. Avoid heavy frameworks.
3. **Styling**: Do not add CSS frameworks (Tailwind, Bootstrap, etc.). Use vanilla CSS with CSS custom properties for theming.
4. **Editor Integration**: Use CodeMirror 6 for all editor-related functionality.
5. **Testing**: When adding new logic, consider how it can be tested.
6. **Persistence**: Ensure user input is persisted in `localStorage` where appropriate.
7. **Performance**: Keep the bundle size small; favor modularity.
8. **Commits**: Make frequent, descriptive commits to allow for easier rollbacks.
9. **Documentation**: Keep `PLAN.md` updated as tasks are completed.
