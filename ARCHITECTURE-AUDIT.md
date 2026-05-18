w- **AdminStore**: `adminStore.client.ts` y `adminStore.server.ts` eliminados. Toda la lógica unificada en `src/lib/adminStore.ts` (SSR-safe).
- **Endpoint Ventas**: Creado `src/app/api/sales/route.ts` para estandarizar el acceso a métricas de BI.
- **DB Layer**: `db.server.ts` es ahora el único punto de creación del cliente `supabaseAdmin`.
- **Deduplicación**: `supabaseAdmin.ts` y `dbServer.ts` ahora son re-exporters de `db.server.ts`, garantizando el uso de *Circuit Breaker* en todo el sistema.
- **Bot Engine**: Eliminado `src/lib/whatsapp/botEngine.ts` (redundancia innecesaria).

Ningún importador fue modificado — compatible hacia atrás ✅.
