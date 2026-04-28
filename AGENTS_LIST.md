# 🤖 Agentes y Habilidades GSD Disponibles en Snacks 911

Actualmente, el proyecto utiliza un framework de agentes autónomos (GSD) alojado en el directorio `.agent/skills/`. A continuación se listan las 68 habilidades/agentes instalados, divididos por su función principal.

## 🌟 Agentes Principales (Flujo de Trabajo)
1. **`gsd-autonomous`**: Toma el control completo. Analiza el roadmap, planifica la siguiente fase, la ejecuta escribiendo código y valida.
2. **`gsd-manager`**: Panel de control interactivo para administrar las fases de desarrollo.
3. **`gsd-plan-phase`**: Analiza los requerimientos de la fase actual y genera un archivo `PLAN.md` súper detallado de cómo programarlo.
4. **`gsd-execute-phase`**: Lee el `PLAN.md` y empieza a escribir código de forma paralela en el repositorio.
5. **`gsd-progress`**: Revisa el estado actual del proyecto, lee documentos en `.planning/` y determina cuál es la siguiente acción.
6. **`gsd-audit-fix`**: Pipeline autónomo que encuentra bugs, los clasifica, los repara, hace pruebas y commitea la solución.
7. **`gsd-map-codebase`**: Escanea toda la arquitectura y genera archivos de inteligencia (`.planning/codebase/`) para dar contexto profundo a la IA.

## 🛠️ Todos los Agentes (.agent/skills/)
- gsd-add-backlog
- gsd-add-phase
- gsd-add-tests
- gsd-add-todo
- gsd-analyze-dependencies
- gsd-audit-fix
- gsd-audit-milestone
- gsd-audit-uat
- gsd-autonomous
- gsd-check-todos
- gsd-cleanup
- gsd-code-review
- gsd-code-review-fix
- gsd-complete-milestone
- gsd-debug
- gsd-discuss-phase
- gsd-do
- gsd-docs-update
- gsd-execute-phase
- gsd-explore
- gsd-fast
- gsd-forensics
- gsd-health
- gsd-help
- gsd-import
- gsd-insert-phase
- gsd-intel
- gsd-join-discord
- gsd-list-phase-assumptions
- gsd-list-workspaces
- gsd-manager
- gsd-map-codebase
- gsd-milestone-summary
- gsd-new-milestone
- gsd-new-project
- gsd-new-workspace
- gsd-next
- gsd-note
- gsd-pause-work
- gsd-plan-milestone-gaps
- gsd-plan-phase
- gsd-plant-seed
- gsd-pr-branch
- gsd-profile-user
- gsd-progress
- gsd-quick
- gsd-reapply-patches
- gsd-remove-phase
- gsd-remove-workspace
- gsd-research-phase
- gsd-resume-work
- gsd-review
- gsd-review-backlog
- gsd-scan
- gsd-secure-phase
- gsd-session-report
- gsd-set-profile
- gsd-settings
- gsd-ship
- gsd-stats
- gsd-thread
- gsd-ui-phase
- gsd-ui-review
- gsd-undo
- gsd-update
- gsd-validate-phase
- gsd-verify-work
- gsd-workstreams
