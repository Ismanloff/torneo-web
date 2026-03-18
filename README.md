# Torneo Web

Portal del torneo con dos superficies diferenciadas:

- `público`: seguimiento, clasificación, cruces e inscripción de equipos
- `staff`: operativa PWA por PIN para árbitros, organización y superadministración

## Arquitectura actual

- `torneo-web` mantiene el portal público y el alta de equipos.
- `torneo-web` usa Supabase como fuente compartida de equipos, categorías, partidos y resultados.
- `torneo-web` expone una PWA staff con acceso por PIN para:
  - árbitros
  - organización
  - superadministración
- `torneo-web` añade:
  - reglas de puntuación por categoría
  - partidos y cruces
  - marcadores y check-ins
  - ajustes manuales
  - clasificación pública

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
- `category_operational_settings`
- `category_schedule_runs`
- `staff_profiles`
- `staff_assignments`
- `team_checkins`
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
- Inscripciones: [https://torneo.eloos.es/inscripcion](https://torneo.eloos.es/inscripcion)
- Staff PWA: [https://torneo.eloos.es/app](https://torneo.eloos.es/app)

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

El registro de equipos sigue activo en `torneo-web`. La PWA staff usa PIN y la superadministración usa la clave interna configurada en `ADMIN_ACCESS_KEY`.
