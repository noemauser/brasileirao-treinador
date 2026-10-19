# Como atualizar o Brasileirão no Google Drive (v10.9)

## O que foi corrigido
- Emblemas das Séries **C e D** (e todos os 92 clubes) com crests oficiais
- Novo `logo-tm.js` que carrega o escudo do Transfermarkt automaticamente
- `index.html` v10.9 que carrega o patch

## Instalação rápida (2 minutos)

### Opção A — ZIP completo
1. Baixe: https://github.com/noemauser/brasileirao-treinador/raw/main/Brasileirao_v10.9_logos.zip
2. Extraia
3. No Drive, pasta **Brasileirão**, substitua:
   - `index.html`
   - pasta `assets/img/logos/` (todas as 92 imagens)
   - adicione `assets/js/logo-tm.js`
4. Abra o jogo e faça **Ctrl+F5** (hard refresh)

### Opção B — só o mínimo (já resolve emblemas C/D)
Mesmo sem trocar as PNGs, só com estes 2 arquivos os emblemas oficiais aparecem (CDN):
1. https://github.com/noemauser/brasileirao-treinador/raw/main/index.html
2. https://github.com/noemauser/brasileirao-treinador/raw/main/assets/js/logo-tm.js  → salve em `assets/js/logo-tm.js`

## Fotos de jogadores
Muitos já estão reais no Drive. Placeholders (~1 KB) restantes são sobretudo Série D com pouca cobertura no Transfermarkt — próxima fase preenche o resto.

## Repo
https://github.com/noemauser/brasileirao-treinador
