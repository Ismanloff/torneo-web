# Torneo Web

Portal de competicion y puntuacion para el torneo, separado del alta publica de equipos.

## Arquitectura actual

- `eloos.es` mantiene las inscripciones.
- `torneo-web` lee los equipos ya inscritos desde la misma base de Supabase.
- `torneo-web` anade solo puntuacion:
  - reglas de puntos por categoria
  - partidos
  - marcadores
  - ajustes manuales
  - clasificacion publica

## Base de datos compartida

Fuente de inscritos actual:

- `tournaments`
- `categories`
- `teams`
- `parental_confirmations`

Tablas nuevas de scoring creadas para no romper el flujo existente:

- `category_scoring_rules`
- `category_matches`
- `team_score_adjustments`
- vista `category_standings`

SQL local de referencia:

- [supabase/scoring_schema.sql](/Users/admin/Movies/Torneo/torneo-web/supabase/scoring_schema.sql)

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
ADMIN_ACCESS_KEY=
```

## URLs

- Portal publico: [https://torneo.eloos.es](https://torneo.eloos.es)
- Login admin: [https://torneo.eloos.es/admin/login](https://torneo.eloos.es/admin/login)
- Inscripciones: [https://eloos.es/torneos/inscripcion](https://eloos.es/torneos/inscripcion)

## Arranque local

```bash
pnpm install
pnpm dev
```

## Verificacion

```bash
pnpm lint
pnpm build
```

## Nota importante

Este proyecto ya no debe usarse para registrar equipos. La ruta `/api/register` responde `410` y redirige conceptualmente al flujo de `eloos.es` para mantener coherencia en una sola fuente de inscripción.
