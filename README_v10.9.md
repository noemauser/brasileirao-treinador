# Brasileirão Treinador v10.9 — Phase 5 logos fix

## Problema
No Drive, emblemas de muitos clubes das Séries C e D eram placeholders (~4–6 KB).
Fotos de alguns jogadores também eram placeholders (~1 KB).

## Correção
1. `assets/js/logo-tm.js` — mapa de IDs Transfermarkt + troca automática de `club.logo` para o crest oficial (CDN).
2. `assets/img/logos/*.png` — 92 emblemas reais baixados (TM / Wikimedia).
3. `index.html` — carrega `logo-tm.js` entre clubs-data e game.js; versão 10.9.

## Como instalar no Drive
1. Baixe este repositório (ZIP).
2. Na pasta Brasileirão do Drive, substitua:
   - `index.html`
   - `assets/js/logo-tm.js` (novo)
   - toda a pasta `assets/img/logos/`
3. Recarregue o jogo com hard refresh (Ctrl+F5).

## Faces
As fotos reais dos jogadores com `tmId` no clubs-data continuam em `assets/img/faces/`.
Placeholders (~1KB) ainda podem aparecer em elencos da Série D com pouca cobertura TM; fase seguinte preenche o restante.
