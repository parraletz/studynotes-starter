# Instrucciones para GitHub Copilot

Este repositorio usa `AGENTS.md` en la raíz como fuente única de instrucciones para agentes. Léelo y síguelo.

Resumen de lo indispensable:

- Usuario nuevo en AWS: explica en español, pasos cortos.
- Antes de desplegar: `npm run check`, luego `npm run diff`, resume el plan y espera aprobación.
- Costo casi cero: no subas `maxEnvironments`/`rateLimit` ni agregues servicios con costo fijo sin avisar.
- Nunca pidas ni guardes access keys; solo `aws login`.
- Cada ruta nueva lleva test en `test/` con `MemoryNotesRepo`.
