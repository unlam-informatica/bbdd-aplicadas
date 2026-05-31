# Template GitHub Pages — just-the-docs (UNLaM)

Template base para sitios de cursada en GitHub Pages usando el tema [just-the-docs](https://just-the-docs.com/) con customizaciones propias.

## Qué incluye

- **`_config.yml`** — configuración Jekyll con `remote_theme: just-the-docs/just-the-docs`, color scheme dark, search y heading anchors habilitados.
- **`_sass/custom/setup.scss`** — overrides previos al tema (paleta de colores). Vacío por defecto: respeta la paleta `dark` original.
- **`_sass/custom/custom.scss`** — overrides posteriores al tema:
  - Sidebar fijo en 25rem (≥ 1064px), links alineados a la izquierda.
  - Layout de 3 columnas en pantallas ≥ 1100px: `sidebar | contenido | TOC`.
  - Wrapper `.main-content-toc-wrap` con `max-width: 1000px` y centrado.
  - TOC de página (columna derecha) con sticky, scroll, sección activa resaltada.
  - Estilos para `.main-content`, tablas, bloques de código y sidebar.
- **`_includes/head_custom.html`** — inyecta `page-toc.js` en el `<head>`.
- **`assets/js/page-toc.js`** — genera el TOC de página a partir de los `h2`/`h3` con `id`, lo envuelve junto al contenido en `.main-content-toc-wrap`, e implementa el highlight con `IntersectionObserver`.
- **`assets/favicon/`** — favicons en múltiples tamaños y `site.webmanifest` (reemplazar por los de la materia).
- **`index.md`** — home con placeholders.
- **`.gitignore`** — exclusiones de Jekyll (`_site/`, caches, `Gemfile.lock`, etc.).

## Uso como template

1. Crear repo a partir del template de GitHub.
2. Editar `_config.yml`: `title`, `description`, `baseurl`, `aux_links` (GitHub).
3. Reemplazar `assets/favicon/*` por los del proyecto.
4. Editar `assets/favicon/site.webmanifest`: `name`, `short_name` y los paths de los íconos (reemplazar `/nombre-del-repo/` por el `baseurl` real — el archivo es JSON estático, Jekyll no procesa Liquid ahí).
5. Reemplazar el contenido de `index.md`.
6. Activar GitHub Pages: Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`.

## Personalización

- **Cambiar paleta de colores**: agregar variables Sass en `_sass/custom/setup.scss` antes de la línea comentada (ver [just-the-docs customization](https://just-the-docs.com/docs/customization/)).
- **Layout sin TOC**: borrar `_includes/head_custom.html` y `assets/js/page-toc.js`; ajustar `custom.scss` para eliminar `.main-content-toc-wrap` y `.page-toc`.
- **Sidebar de ancho distinto**: cambiar `width: 25rem` y `margin-left: 25rem` en el bloque `@media (min-width: 66.5rem)` de `custom.scss`.
