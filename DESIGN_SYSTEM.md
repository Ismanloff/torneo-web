# Design System — Torneo Escolar Intercentros 2026

Documento operativo para mantener coherencia visual, de producto y de rol en la PWA. No reemplaza a `BRANDING.md`: lo traduce a reglas de uso reales.

## 1. Principios

### 1.1 Primero operativa, luego decoracion

La app se usa en contexto de evento. La interfaz debe ayudar a tomar decisiones y ejecutar acciones en segundos. Ningun efecto visual puede competir con:

- estado del partido
- siguiente accion
- identidad del equipo
- pista, hora y staff asignado

### 1.2 Una pantalla, un protagonista

Cada pantalla debe tener un bloque principal claro. El usuario tiene que entender en menos de 1 segundo donde esta el foco.

- `Home operativa`: siguiente partido o resumen operativo
- `Partido`: marcador y estado
- `Equipo`: estado de llegada y agenda
- `Gestion`: acciones administrativas del contexto actual

### 1.3 Densidad distinta segun contexto

No todo debe vivir en tarjetas grandes.

- usar `hero` o panel fuerte para la accion principal
- usar filas compactas para listas largas
- usar modal para edicion avanzada
- evitar convertir tablas, agendas o backoffice en una pila infinita de cards

### 1.4 Una sola superficie por intencion

Las superficies se usan con significado:

- `app-panel-strong`: foco primario, resumen protagonista
- `app-panel`: modulo principal de trabajo
- `app-soft-card`: soporte, subestado o dato auxiliar
- `admin-card`: bloque de gestion
- `public-glass`: bloque publico destacado
- `public-soft`: fila o bloque publico de densidad media

No mezclar superficies sin una razon clara.

### 1.5 El estado se entiende de un vistazo

Los estados operativos deben leerse mas rapido que el texto descriptivo.

- `En juego` debe sentirse vivo
- `Programado` debe sentirse estable
- `Finalizado` debe sentirse resuelto
- `Incidencia` y `cancelado` deben cortar visualmente la continuidad

### 1.6 Cada rol ve una app distinta

La misma base visual no implica la misma experiencia.

- `assistant`: guiado, simple, rapido
- `referee`: concentrado en partido y validacion
- `admin`: control, densidad y contexto cruzado

Si una pantalla intenta servir igual a todos, esta mal definida.

### 1.7 Premium no significa mas efectos

La sensacion premium viene de:

- jerarquia consistente
- buen espaciado
- tipografia clara
- superficies con profundidad controlada
- pocos colores bien usados

No viene de meter glass, blur o gradientes en todas partes.

### 1.8 Plataforma antes que tendencia

Cuando haya conflicto entre una tendencia visual y una convencion movil clara, manda la convencion.

- targets grandes
- navegacion estable
- pocas opciones principales
- patrones reconocibles

La app puede tener personalidad sin dejar de ser obvia.

---

## 2. Componentes Canonicos

Estos son los bloques oficiales de la app. Cualquier pantalla nueva debe componerse desde aqui antes de inventar un patron nuevo.

### 2.1 App Shell

Contenedor base de la experiencia instalada/PWA.

- clases base: `app-canvas`, `app-shell`, `app-topbar`, `app-shell-content`
- comportamiento: lienzo oscuro continuo, topbar sticky, contenido centrado, navegacion inferior flotante
- uso: todas las vistas internas de `app`

### 2.2 Hero Operativo

Bloque protagonista de cada pantalla interna.

- clases base: `app-hero`, `app-hero__content`
- contenido ideal:
  - kicker corto
  - titulo de alto impacto
  - 1 resumen claro
  - 1-2 acciones maximo
- no usar para listas largas ni configuracion secundaria

### 2.3 Panel Principal

Superficie de trabajo o lectura principal.

- clases base: `app-panel`
- uso:
  - detalle de equipo
  - formulario operativo
  - bloque de agenda
  - lista de partidos moderada

### 2.4 Panel Fuerte

Superficie premium o de alta prioridad.

- clases base: `app-panel-strong`
- uso:
  - marcador principal
  - resumen del siguiente partido
  - scanner
  - bloque de decision importante

### 2.5 Soft Card

Apoyo visual de menor peso.

- clases base: `app-soft-card`
- uso:
  - metricas secundarias
  - subestados
  - microresumenes

No debe competir con el panel fuerte.

### 2.5.b Fila Operativa Compacta

Patron por defecto para listas largas de partidos, equipos o tareas.

- uso:
  - agenda de partidos
  - listados de equipos
  - bloques de admin con mucho volumen
- debe mostrar siempre:
  - identidad principal
  - estado
  - contexto corto
  - accion inmediata o destino

Si una lista supera 4-5 items visibles, empezar aqui antes de pensar en cards altas.

### 2.6 Navegacion Inferior

Dock principal de la PWA.

- clases base: `app-nav`, `app-nav__grid`, `app-nav__item`, `app-nav__item--active`
- objetivo: navegar por `3-5` destinos maximo
- regla: no meter acciones destructivas ni configuracion profunda en el dock

### 2.7 Accion Primaria

Llamada a la accion principal de una superficie.

- clases base: `app-action`
- uso:
  - guardar resultado
  - abrir escaner
  - registrar llegada
  - entrar a gestion

Cada superficie debe tener una sola accion primaria dominante.

### 2.8 Accion Secundaria

Accion de soporte o navegacion contextual.

- clases base: `app-action--ghost`, `app-link-pill`
- uso:
  - ver detalle
  - abrir operativa
  - volver
  - descargar PDF

### 2.9 Admin Tabs

Selector de contexto de gestion.

- clases base: `admin-tabs`, `admin-tab`, `admin-tab--active`
- uso: cambiar de dominio de trabajo, no de microfiltro
- regla: pocas tabs, nombres cortos y semanticos

### 2.10 Admin Card

Superficie de gestion con mas densidad.

- clases base: `admin-card`
- uso:
  - bloques de configuracion
  - ficha compacta de partido en backoffice
  - asignaciones
  - acciones avanzadas

### 2.11 Admin Modal

Edicion avanzada o acciones con mas riesgo.

- componentes: `AdminModal`
- regla:
  - la tarjeta de lista muestra resumen y acciones rapidas
  - la configuracion detallada va dentro del modal

### 2.12 Public Glass

Superficie premium de la zona publica.

- clases base: `public-glass`
- uso:
  - hero de portada
  - tablas publicas destacadas
  - bloques de clasificacion

### 2.13 Public Soft Row

Bloque publico de densidad media.

- clases base: `public-soft`
- uso:
  - filas de partidos
  - elementos de cuadro
  - tarjetas secundarias

### 2.14 Badge y Estado

Los estados deben ser compactos, legibles y repetibles.

- forma: pill o etiqueta corta
- texto: una o dos palabras
- orden de prioridad visual:
  - `En juego`
  - `Programado`
  - `Finalizado`
  - `Cancelado`
  - `Incidencia`

### 2.15 Score Block

Bloque tipografico de marcador.

- fuente: `font-mono` o display con `tabular-nums`
- regla:
  - no usar pesos flojos
  - no romper la alineacion de digitos
  - el score debe dominar sobre metadatos

---

## 3. Guardrails de Plataforma

### 3.1 Touch targets

- minimo: `44x44 pt` en iOS
- minimo: `48x48 dp` en Android
- aplicacion practica:
  - botones primarios
  - items del dock
  - tabs
  - toggles
  - acciones de fila

### 3.2 Navegacion top-level

- la navegacion persistente no debe superar `5` destinos
- si hay mas de 5 areas, agrupar o mover a gestion/contexto secundario
- las tabs de admin cambian de dominio de trabajo, no sustituyen la navegacion principal

### 3.3 Una sola accion principal por viewport

En movil, si dos botones compiten como CTA principal, la pantalla no esta resuelta.

### 3.4 PWA instalada

En modo instalado o standalone:

- la app debe ofrecer su propia orientacion
- siempre debe existir forma clara de volver o cambiar de seccion
- no confiar en la barra del navegador para contexto ni escape

### 3.5 Cards: cuando si, cuando no

Usar card cuando:

- hay un modulo protagonista
- hay resumen + accion
- hay informacion agrupada de alto valor

No usar card como patron por defecto cuando:

- hay listas largas
- el usuario compara filas rapidamente
- la prioridad es velocidad operativa

### 3.6 Motion

- usar motion en feedback, entrada o cambio de estado
- evitar motion continuo si no aporta contexto
- `prefers-reduced-motion` tiene prioridad siempre

---

## 4. Reglas Por Rol

### 3.1 Assistant

Objetivo: flujo rapido de mesa, recepcion y escaneo.

- prioridad:
  - llegada
  - escaneo
  - validacion de equipo
  - acceso a partido si necesita contexto
- tono visual:
  - guiado
  - pocas decisiones simultaneas
  - acciones muy claras
- no mostrar:
  - configuracion estructural
  - herramientas de gestion
  - controles de marcador avanzados

### 3.2 Referee

Objetivo: ejecutar el partido y registrar resultado.

- prioridad:
  - marcador
  - estado del partido
  - equipos implicados
  - hora, pista y notas
- tono visual:
  - enfoque
  - minima distraccion
  - informacion critica arriba
- no mostrar:
  - check-in de mesa como accion principal
  - configuracion del torneo
  - herramientas de staff no relacionadas

### 3.3 Admin

Objetivo: coordinar operativa y estructura del torneo.

- prioridad:
  - panorama general
  - acceso rapido a gestion
  - cambios de estado
  - asignaciones y ajustes
- tono visual:
  - mas densidad
  - mas contexto cruzado
  - control sin saturacion
- regla:
  - separar `Operativa` de `Gestion`
  - no mezclar scoring en vivo con formularios estructurales largos

---

## 5. Reglas De Composicion

### 4.1 Ritmo vertical

- usar separaciones amplias entre secciones principales
- dentro de una misma superficie, agrupar por cercania funcional
- evitar huecos decorativos sin significado

### 4.2 Titulacion

- `font-display` para heroes, secciones y scores grandes
- `Inter` para cuerpo, formularios y navegacion
- `JetBrains Mono` para PIN, codigos, tiempos y scores sensibles a alineacion

### 4.3 Numero maximo de acciones por bloque

- hero: 1 principal + 1 secundaria
- card/lista: 1 accion dominante
- modal: hasta 2 acciones de salida claras

### 4.4 Listas largas

Cuando haya mucho volumen:

- priorizar filas compactas o bloques continuos
- evitar cards demasiado altas
- mantener siempre visible:
  - estado
  - equipo/partido
  - hora o pista
  - siguiente accion

### 4.5 Color

- el acento verde es reserva para:
  - accion primaria
  - live/senal positiva
  - focos operativos
- el cian informa
- el rojo solo marca riesgo o incidencia
- no usar demasiados colores simultaneos en una misma pantalla

### 4.6 Motion

- usar animacion para reforzar cambios, no para decorar vacio
- si una animacion no ayuda a entender:
  - estado
  - transicion
  - feedback
  entonces sobra

---

## 6. Checklist Para Pantallas Nuevas

Antes de cerrar una pantalla nueva, validar:

1. Tiene un bloque protagonista claro.
2. La accion principal se entiende sin leer todo.
3. El rol que entra aqui no ve ruido innecesario.
4. Los estados se distinguen en menos de 1 segundo.
5. La densidad es correcta para movil.
6. No se ha inventado un patron nuevo sin necesidad.
7. El layout sigue las superficies canonicas del sistema.
8. Los controles clave cumplen target tactil minimo.
9. La pantalla seguiria funcionando igual de clara instalada como PWA.

---

## 7. Mapa De Implementacion Actual

### Shell y base visual

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/app/layout.tsx`
- `src/components/app-shell-nav.tsx`

### Operativa

- `src/app/app/page.tsx`
- `src/app/app/partidos/page.tsx`
- `src/app/app/partido/[id]/page.tsx`
- `src/app/app/equipos/page.tsx`
- `src/app/app/equipo/[id]/page.tsx`
- `src/app/app/scan/page.tsx`
- `src/components/offline-score-form.tsx`

### Gestion

- `src/components/admin-control-center.tsx`
- `src/components/admin-tabs-shell.tsx`
- `src/components/admin-partidos-tab.tsx`
- `src/components/admin-staff-tab.tsx`
- `src/components/admin-config-tab.tsx`

### Publico

- `src/components/public-page-shell.tsx`
- `src/components/sport-tabs.tsx`
- `src/components/bracket-tree.tsx`
- `src/components/category-grid.tsx`

---

## 8. Relacion Con BRANDING

`BRANDING.md` responde a:

- que identidad tiene la app
- por que usamos esta tipografia
- que direccion visual seguimos

`DESIGN_SYSTEM.md` responde a:

- como se compone una pantalla
- que componente usar en cada caso
- que cambia segun el rol
- que no deberia diseñarse de nuevo

---

## 9. Backlog de mejora sin overkill

Mejoras razonables para fases futuras:

- shortcuts de PWA solo cuando las `2-4` acciones mas repetidas esten estabilizadas
- tokens semanticos mas finos para estados y deportes si aparecen mas superficies que los necesiten
- auditoria visual puntual por rol cuando entre mas staff al torneo

No son prioridad mientras no mejoren claramente la operativa.
