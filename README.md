<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/04b31eba-205b-4d51-9a82-9e7c8ea8bfb9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Herói Akles (sprite sheets)

O herói cavaleiro **Akles** usa sprite sheets processadas a partir da arte crua
(fundo magenta) colocada em `art_src/` (não versionada). Para regerar:

```
node scripts/process-akles.mjs
```

O script faz chroma key do fundo magenta, detecta as 4 linhas de direção
(down / left / up / right) e as colunas de cada quadro por conteúdo, normaliza a
escala e ancora os pés, gravando folhas limpas em
`public/assets/characters/akles/` (idle, walk, run, slash, thrust, spin, special, cast).

## Controles

- **Teclado:** WASD / setas para mover · F ou 1 (cortar) · 2 (minerar) · J (espada) · K (giro) · L (magia) · scroll = zoom
- **Celular:** joystick analógico virtual (canto inferior esquerdo) + botões de ação (canto inferior direito)
