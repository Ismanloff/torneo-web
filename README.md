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

## Acceso operativo

- `árbitro` y `organización` entran con su `PIN` individual desde [https://torneo.eloos.es/login](https://torneo.eloos.es/login)
- `admin` puede entrar con PIN si tiene perfil activo en `staff_profiles`
- `superadmin` entra desde el bloque `Acceso superadmin` del login usando la variable de entorno `ADMIN_ACCESS_KEY`

Regla de seguridad:

- no documentar ni versionar el valor real de `ADMIN_ACCESS_KEY`
- el valor debe guardarse solo en variables de entorno del entorno local o de producción
- si hace falta compartirlo con alguien, hacerlo fuera del repositorio y rotarlo si se ha expuesto

## Réplica local con Docker

La forma recomendada de montar una réplica local es usar Supabase CLI, que levanta el stack en Docker y expone Postgres, API, Auth, Studio e Inbucket.

Pasos:

1. Exporta un snapshot local de datos desde el proyecto actual:
   - `npm run db:local:seed:export`
2. Arranca el stack y aplica esquema + snapshot con el bootstrap local:
   - `npm run db:local:bootstrap`
3. Obtén las variables locales del stack:
   - `npm run db:local:env`
4. Genera un entorno de app/tests apuntando al Supabase local:
   - `npm run db:local:env:write`

Notas:

- El snapshot se genera en `supabase/seeds/999_local_snapshot.sql`.
- Ese archivo queda fuera de git para no versionar datos reales.
- La réplica usa el esquema SQL del repo y una semilla exportada desde tu proyecto Supabase actual.
- `npm run db:local:start` solo levanta los contenedores. El comando que deja la base lista para usar es `npm run db:local:bootstrap`.
- Si quieres refrescar la réplica antes de otro ensayo, vuelve a exportar el seed y ejecuta `npm run db:local:bootstrap`.

### Tests sobre la réplica local

Una vez generado `.env.local.docker`, puedes ejecutar la suite contra Docker sin tocar tu `.env.local` habitual:

- Unit: `npm run test:unit:docker`
- E2E: `npm run test:e2e:docker`
- Flujo completo: `npm run test:docker`
