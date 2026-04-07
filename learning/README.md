# Learning elevate-ts: Building a Todo App

Welcome! This learning path teaches functional programming with **elevate-ts** by building a
complete, production-ready todo application from scratch.

## What You'll Learn

1. **Core Concepts** — `Maybe`, `Either`, `State`, and `Validation` monads
2. **Point-Free Composition** — Writing functions that compose by shape, not naming
3. **Data-Last Order** — Why `(config) => (data) => result` matters
4. **Practical FP** — Real error handling, validation, and state management
5. **Testing** — Testing pure functions and effects

## The Learning Path

### 📖 [01: Introduction](./01-introduction.md)

Start here. Understand what we're building, why it's a good teaching tool, and the philosophy
behind elevate-ts.

**Time:** 5 min | **Level:** Beginner

### 📖 [02: Core Concepts](./02-core-concepts.md)

Learn the four monads we'll use: `Maybe`, `Either`, `State`, and `Validation`. Includes
interactive examples and mental models.

**Time:** 20 min | **Level:** Beginner

### 📖 [03: Building the App](./03-building-the-app.md)

Step-by-step walkthrough of the todo app architecture. See how the concepts from 02 combine
into a real application.

**Time:** 30 min | **Level:** Intermediate

### 📖 [04: Testing Functional Code](./04-testing-functional-code.md)

Learn patterns for testing pure functions, effects, and state machines. Includes examples from
the todo app.

**Time:** 15 min | **Level:** Intermediate

## Running the Todo App

```bash
cd learning/todo-app

# Install dependencies
pnpm install

# Start dev server with HMR
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build for production
pnpm build
```

The app runs on `http://localhost:5173`.

## The Todo App Features

✅ Add, complete, delete todos  
✅ Filter by status (All, Active, Completed)  
✅ Undo/Redo with pure State monad  
✅ Form validation with Validation monad  
✅ Persistent state (localStorage)  
✅ Full test coverage (>90%)  

## Key Files

### Learning Docs

- `01-introduction.md` — Philosophy and architecture overview
- `02-core-concepts.md` — Detailed monad explanations with examples
- `03-building-the-app.md` — Component-by-component walkthrough
- `04-testing-functional-code.md` — Testing patterns and examples

### Application Code

- `todo-app/src/types.ts` — Domain types (Todo, Filter, etc.)
- `todo-app/src/domain.ts` — Pure business logic (all functions)
- `todo-app/src/App.svelte` — UI component (side effects)
- `todo-app/tests/domain.test.ts` — All tests

## Tips for Learning

1. **Read sequentially** — Each guide builds on the previous
2. **Experiment** — Modify the app code and see what breaks
3. **Run the tests** — They document behavior and show patterns
4. **Open the browser** — Use DevTools to see state changes
5. **Refer to types** — TypeScript guides you; hover over functions

## Common Questions

**Q: Why functional programming?**  
A: FP makes state management explicit, side effects trackable, and code testable. Perfect for
UIs that need undo/redo, form validation, and async operations.

**Q: Is this production-ready?**  
A: Yes! The code follows the same patterns you'd use in real apps. Scale by adding more
modules and tests.

**Q: Can I use this in my project?**  
A: Absolutely. Copy the patterns from `domain.ts` into your app. The UI library (Svelte) is
optional—the same patterns work with React, Vue, or vanilla.

**Q: What if I don't know TypeScript?**  
A: The code is beginner-friendly. Types are your allies; they catch mistakes and document
intent. Read [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-for-javascript-programmers.html)
in parallel.

## Next Steps

- **Finished learning?** Explore [samples/](../samples/README.md) for more examples
- **Want to contribute?** See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Have questions?** Open an issue or PR on GitHub

---

**Happy learning! 🚀**
