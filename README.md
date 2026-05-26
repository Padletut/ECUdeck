# ECUdeck

**Built by Tuners. For Tuners. No BS.**

ECUdeck is moving to a desktop-first architecture built around Vite, React, Rust, Tauri, and MkDocs. The goal is a faster, more maintainable engineering workspace for firmware analysis, remapping, plugin authoring, and reviewable AI-assisted workflows.

---

## Architecture Direction

- Desktop UI powered by React + Vite
- Native shell and future command bridge powered by Tauri + Rust
- Documentation generated with MkDocs
- Existing frontend editor components preserved and migrated away from Next.js
- Legacy Python experiments retained for reference during the Rust migration

---

## Repository Layout

- `src/`: Vite + React application source
- `src-tauri/`: Tauri desktop shell scaffold
- `docs/` + `mkdocs.yml`: project documentation
- `core/`: planned Rust engine area for parsing, graphing, checksums, and jobs
- `legacy/python_backend/`: old Python-based experiments kept temporarily during migration

---

## 🛠 Tech Stack

- **Frontend:** [React](https://react.dev/), [Vite](https://vite.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Desktop Shell:** [Tauri](https://tauri.app/) with Rust
- **Documentation:** [MkDocs](https://www.mkdocs.org/)
- **Data / Experiments:** Legacy Python artifacts are retained only as migration reference
- **Testing:** Jest, Playwright, Testing Library
- **Tooling:** ESLint, Prettier, Husky, lint-staged

---

## 📂 Project Status

This is an active migration from a web-only Next.js prototype to a Vite + Tauri desktop workspace. The current focus is stack cleanup, structure cleanup, and preserving the editor foundations while the Rust core grows in behind them.

---

## 🤝 Contribute

We welcome tuners, devs, reverse engineers and UI/UX folks!  
The architecture notes in [new structure plan.md](./new%20structure%20plan.md) and the docs site are the best place to follow the migration direction.

---

## 📄 License

MIT — use it, fork it, make it better.
