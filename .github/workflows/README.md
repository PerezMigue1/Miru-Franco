# GitHub Actions en este repositorio

## Qué hace el workflow `ci.yml`

- **Cuándo se ejecuta**: en cada **push** y en cada **pull request** a las ramas `main` o `master`.
- **Dónde se ve**: en GitHub → pestaña **Actions** del repositorio.

### Jobs

1. **Lint y build**: instala dependencias, ejecuta `npm run lint` y `npm run build`.
2. **Pruebas**: instala dependencias y ejecuta `npm test` (por ahora corre el linter; puedes cambiarlo por Jest/Vitest más adelante).

## Qué necesitas para que funcione

1. **Repositorio en GitHub**: el proyecto debe estar en GitHub (no solo local).
2. **Subir el workflow**: haz commit y push de la carpeta `.github/workflows/ci.yml`.
3. **Rama**: el workflow está configurado para `main` y `master`. Si usas otra rama por defecto, edita `ci.yml` y cambia `branches:`.

## Cómo probar

1. Haz commit de los cambios:
   ```bash
   git add .github/workflows/ci.yml package.json
   git commit -m "ci: add GitHub Actions workflow"
   ```
2. Sube a GitHub:
   ```bash
   git push origin main
   ```
   (o `master` si esa es tu rama principal.)
3. Entra en tu repo en GitHub → **Actions**. Deberías ver el workflow "CI" ejecutándose y los resultados de cada job.

## Añadir pruebas unitarias más adelante

Cuando quieras usar Jest o Vitest:

1. Instala el test runner (por ejemplo: `npm i -D vitest`).
2. En `package.json`, cambia el script `test` para que ejecute ese runner (por ejemplo: `"test": "vitest run"`).
3. No hace falta tocar el workflow: el job "Pruebas" ya ejecuta `npm test`.
