# Brasileirão — Treinador

Jogo de técnico de futebol no navegador (Séries A · B · C · D).  
**Repositório único oficial** — unificado em 19/10/2026 (antes: `brasileirao-treinador` + `brasileirao-assets-v11`).

## Versão atual: **v11.0**

| Item | Status |
|------|--------|
| Clubes | 92 (A20 · B20 · C20 · D32) |
| Logos oficiais | **92/92** |
| Faces reais (TM) | ~66% overall · **Série A ~99%** |
| Faces sem foto pública | avatars com iniciais + cores do clube |
| `tmId` de clube | 92/92 |

## Como jogar

1. Clone ou baixe o ZIP do repositório  
2. Abra `index.html` no navegador (funciona offline, sem servidor)  
3. Ou sincronize a pasta com o Google Drive **Brasileirão**

```bash
git clone https://github.com/noemauser/brasileirao-treinador.git
cd brasileirao-treinador
# abra index.html
```

## Estrutura

```
index.html
assets/
  css/game.css
  js/game.js
  js/logo-tm.js          # CDN fallback de emblemas
  data/clubs-data.js     # elencos + faceReal + tmId
  data/clubs.json        # metadados / contagens
  data/club_tm_map.json
  img/logos/             # 92 emblemas
  img/faces/             # faces do elenco
```

## Drive

A mesma versão fica na pasta Google Drive **Brasileirão** (`index.html` + `assets/`).  
Mantenha Drive e este repo alinhados na **última versão**.

## Notas

- Emblemas: arquivos locais + fallback Transfermarkt CDN (`logo-tm.js`)
- Fotos: Transfermarkt quando existe `portraitUrl`; caso contrário avatar
- O repositório `brasileirao-assets-v11` foi **fundido neste** e permanece só como redirecionamento

## Licença / uso

Projeto pessoal. Emblemas e fotos de jogadores pertencem aos respectivos clubes / Transfermarkt — uso para o jogo offline do autor.
