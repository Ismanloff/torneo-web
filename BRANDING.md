# Branding & Tipografia — Torneo Escolar Intercentros 2026

Este documento define la direccion de identidad visual y tecnica. Para reglas operativas de interfaz, componentes canonicos y patrones por rol, ver `DESIGN_SYSTEM.md`.

## Stack tipografico

### Fuentes seleccionadas

| Rol | Fuente | Pesos | Uso |
|-----|--------|-------|-----|
| **Display** | Outfit (variable) | 100–900 | Titulos, heroes, nombres de categorias, marcadores grandes |
| **Body** | Inter (variable) | 100–900 | Texto de interfaz, navegacion, formularios, descripciones |
| **Mono** | JetBrains Mono (variable) | 100–800 | Scores en directo, codigos de registro, timers, tablas de clasificacion |

### Por que estas fuentes

**Outfit** reemplaza a Bebas Neue (actual). Bebas Neue solo tiene 1 peso y es solo mayusculas, lo que limita la jerarquia tipografica. Outfit es geometrica con presencia atletica, funciona en mayusculas y minusculas, y al ser variable incluye todos los pesos en un solo archivo.

**Inter** reemplaza a Literata (actual, serif). Inter es el estandar de la industria para interfaces de usuario. Tiene soporte nativo de `tabular-nums` para alinear numeros en tablas de clasificacion. Diseñada especificamente para pantallas a tamaños pequeños.

**JetBrains Mono** se añade como tercera fuente. Actualmente no hay fuente mono. Los marcadores, codigos QR, y estadisticas necesitan digitos de ancho fijo para que no salten visualmente al actualizarse.

### Alternativas evaluadas

| Fuente | Evaluacion |
|--------|------------|
| Archivo Black | Mas condensada y agresiva que Outfit. Buena para esports, quizas demasiado para torneo escolar |
| Plus Jakarta Sans | Mas calida que Inter. Buena alternativa si se quiere mas personalidad en el body |
| Space Grotesk | Futurista, estetica esports. Combina bien con Space Mono para coherencia visual |
| Tourney | Fuente de Google diseñada para torneos/estadios. Demasiado estilizada para uso general, viable solo como acento en el logo |

### Referencia profesional

- **LaLiga** usa un sistema de 3 fuentes custom: LaLiga Headline (display variable), LaLiga Text (body), LaLiga Players (numeros de camiseta)
- **NBA, UEFA, FIFA** siguen el mismo patron: bold condensada para scores, neutral sans-serif para body, monospace para datos densos
- **EA Sports** usa geometrica squared-off (similar a Outfit en pesos altos)

---

## Implementacion tecnica

### Next.js font setup

```tsx
// src/app/layout.tsx
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";

const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// En el body:
<body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
```

### CSS variables

```css
body {
  font-family: var(--font-body), system-ui, sans-serif;
}

.font-display {
  font-family: var(--font-display), system-ui, sans-serif;
}

.font-mono {
  font-family: var(--font-mono), ui-monospace, monospace;
}
```

### Tailwind v4 theme (CSS-first)

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-body), system-ui, sans-serif;
  --font-display: var(--font-display), system-ui, sans-serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;
}
```

Esto habilita las clases `font-sans`, `font-display`, `font-mono` en Tailwind.

### Numeros tabulares

Critico para que los digitos se alineen verticalmente en tablas y marcadores:

```css
.score-value {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.stat-num {
  font-variant-numeric: tabular-nums;
}
```

En Tailwind: `className="tabular-nums"`.

### Rendimiento

- `next/font` descarga las fuentes en build time (self-hosted, sin peticiones a Google en runtime)
- `display: "swap"` evita FOIT (flash of invisible text)
- Variable fonts = 1 archivo por familia con todos los pesos
- Las fuentes se sirven como archivos estaticos hasheados (`/_next/static/media/*.woff2`)
- Cache headers: `Cache-Control: public, max-age=31536000, immutable`

---

## Sistema de color

### Paleta actual (conservar base)

```css
:root {
  --app-bg: #050816;
  --app-bg-soft: #0f172e;
  --app-surface: rgba(14, 20, 38, 0.72);
  --app-text: #f8fafc;
  --app-muted: #8fa1c2;
  --app-accent: #8df65f;
  --app-accent-strong: #54d12b;
  --app-accent-soft: rgba(141, 246, 95, 0.16);
}
```

### Migracion a OKLCH (Tailwind v4 nativo)

OKLCH ofrece gamut mas amplio y uniformidad perceptual:

```css
:root {
  --app-accent: oklch(0.82 0.24 130);
  --app-accent-strong: oklch(0.72 0.26 135);
  --app-accent-soft: oklch(0.82 0.24 130 / 0.16);
}
```

### Colores semanticos por deporte

```css
:root {
  --football: oklch(0.72 0.18 145);   /* verde campo */
  --basketball: oklch(0.68 0.2 55);   /* naranja balon */
  --volleyball: oklch(0.75 0.16 85);  /* dorado/amarillo */
}
```

### Colores de estado

```css
:root {
  --live: oklch(0.7 0.22 30);         /* rojo-naranja para EN DIRECTO */
  --upcoming: oklch(0.7 0.15 230);    /* azul para programado */
  --finished: oklch(0.6 0.05 260);    /* gris para finalizado */
}
```

---

## Guardrails de plataforma

Estas reglas no son de estilo: son limites de usabilidad para que la app siga sintiendose premium sin pasarse.

### Navegacion inferior

- usar la barra inferior solo para `3-5` destinos principales
- los destinos deben ser de primer nivel, no acciones ni filtros
- si una accion es destructiva o de configuracion profunda, no va en el dock

### Targets tactiles

- tamano minimo recomendado: `44x44 pt` en iOS y `48x48 dp` en Android
- cualquier boton clave en movil debe poder pulsarse sin precision fina
- cuando haya varias acciones juntas, el espaciado importa tanto como el tamaño del control

### Cards con criterio

- una card debe agrupar contenido relacionado y una accion clara
- si el usuario tiene que escanear muchas filas, mejor lista compacta o bloque continuo
- no usar cards altas para volumen operativo si una fila resuelve mejor el trabajo

### PWA instalada

- al usar modo app/standalone, la interfaz debe incluir su propia navegacion y affordances de vuelta
- no depender del chrome del navegador para orientacion o salida
- la experiencia instalada debe priorizar foco, legibilidad y acciones recurrentes

### Regla de anti-overkill

Si una decision visual empeora aunque sea un poco la lectura de:

- estado
- score
- siguiente accion
- pista/hora

esa decision no entra.

---

## Profundidad y transparencia (usar con moderacion)

### Capas actuales (mantener)

El proyecto ya usa dark glassmorphism correctamente:
- `backdrop-filter: blur(20px)` en paneles
- Fondos semitransparentes (`rgba(12, 18, 34, 0.8)`)
- Gradientes radiales como orbes de ambiente
- Bordes sutiles (`rgba(255, 255, 255, 0.1)`)

### Mejora opcional: orbes ambientales animados

```css
@keyframes ambient-shift {
  0%, 100% { opacity: 0.18; transform: translate(0, 0) scale(1); }
  50% { opacity: 0.24; transform: translate(2%, -1%) scale(1.04); }
}

.public-arena::after {
  content: "";
  position: fixed;
  top: -20%;
  right: -10%;
  width: 40vw;
  height: 40vw;
  border-radius: 999px;
  background: radial-gradient(circle, oklch(0.82 0.24 130 / 0.2), transparent 65%);
  filter: blur(60px);
  animation: ambient-shift 12s ease-in-out infinite;
  pointer-events: none;
}
```

### Accesibilidad

Siempre asegurar contraste WCAG AA sobre superficies glass. Los fondos actuales con `rgba(12, 18, 34, 0.8)` cumplen. Verificar con herramientas de contraste al cambiar opacidades.

### Limite de uso

- no aplicar blur fuerte a todas las capas
- no encadenar glass + glow + gradiente + borde brillante en el mismo componente por defecto
- reservar la superficie mas rica para heroes, scanner, score principal o puntos de entrada

---

## Micro-interacciones

### Score pop (actualizacion de marcador)

```css
@keyframes score-pop {
  0% { transform: scale(1); }
  30% { transform: scale(1.25); color: var(--app-accent); }
  100% { transform: scale(1); }
}

.score-updated {
  animation: score-pop 0.4s ease-out;
}
```

### Live pulse (indicador de partido en curso)

```css
@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.live-indicator {
  animation: live-pulse 2s ease-in-out infinite;
}
```

### Directrices de motion

- Duracion: 200-500ms para interacciones, 8-15s para ambientales
- Easing: spring physics sobre linear para sensacion natural
- Estilo: snappy y energetico (es app deportiva, no meditacion)
- Respetar `prefers-reduced-motion` (ya implementado en globals.css)
- Framer Motion (`motion`) para animaciones complejas con React 19

---

## Iconos

### Lucide React (mantener)

- 29.4M descargas semanales (14x mas que Phosphor)
- Bundle mas pequeño de su categoria
- Tree-shakeable con Turbopack
- 1600+ iconos, cubre todas las necesidades de UI deportiva
- Diseño stroke-based consistente 24x24

### Iconos custom

Para iconos deportivos especificos (balones, campos, canastas) que Lucide no cubre, usar SVGs custom inline en lugar de añadir otra libreria.

---

## CSS moderno (features a aprovechar)

### Container queries (Tailwind v4 core)

```tsx
<div className="@container">
  <div className="@sm:flex @sm:gap-4 @sm:items-center">
    <span className="score-value text-2xl @sm:text-3xl">3 - 1</span>
  </div>
</div>
```

Las cards de partido se adaptan al tamaño de su contenedor, no al viewport.

### color-mix() (ya en uso)

```css
.field-input--dark::placeholder {
  color: color-mix(in oklch, var(--app-muted) 78%, white 22%);
}
```

### @layer (cascade control)

```css
@layer base {
  /* Estilos base: reset, tipografia global */
}

@layer components {
  /* .panel, .app-card, .public-glass, etc. */
}
```

---

## Resumen de cambios

| Area | Actual | Propuesto |
|------|--------|-----------|
| Display font | Bebas Neue (1 peso, caps) | **Outfit** (variable, 100-900, mixto) |
| Body font | Literata (serif) | **Inter** (sans-serif, UI-first) |
| Mono/Scores | Ninguna | **JetBrains Mono** (variable) |
| Numeros tabulares | No usado | `tabular-nums` en todos los datos numericos |
| Formato de color | hex/rgba | Migrar a **OKLCH** |
| Iconos | Lucide React | **Mantener** |
| Font loading | next/font | Añadir `display: "swap"` y fuente mono |
| Config Tailwind | CSS variables | Añadir bloque `@theme` |

### Que no debemos hacer

- convertir toda la app en una coleccion de tarjetas iguales
- usar mas de una accion primaria fuerte por viewport
- confiar en trends visuales si empeoran densidad operativa
- usar colores semanticos deportivos en todas partes a la vez
- añadir motion continuo salvo en puntos de feedback real

### Prioridad de implementacion

1. **Inmediato**: Cambiar fuentes (Outfit + Inter + JetBrains Mono), añadir `tabular-nums`
2. **Corto plazo**: Colores semanticos por deporte, animaciones score-pop y live-pulse
3. **Medio plazo**: Migrar palette a OKLCH, container queries, orbes ambientales animados

---

## Fuentes de referencia

- [Outfit - Google Fonts](https://fonts.google.com/specimen/Outfit)
- [Inter - Google Fonts](https://fonts.google.com/specimen/Inter)
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- [Tourney - Google Fonts](https://fonts.google.com/specimen/Tourney)
- [LaLiga Custom Font - Arillatype Studio](https://arillatype.studio/laliga-custom-brand-font)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- [Next.js Font Optimization](https://nextjs.org/docs/app/getting-started/fonts)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Apple Layout and organization](https://developer.apple.com/design/human-interface-guidelines/layout-and-organization)
- [Apple Navigation](https://developer.apple.com/design/human-interface-guidelines/navigation)
- [OKLCH Color Space](https://oklch.com/)
- [Android Touch targets](https://developer.android.com/design/ui/mobile/guides/layout-and-content/spacing)
- [MDN Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Lucide vs Phosphor Comparison](https://lucide.dev/guide/comparison)
