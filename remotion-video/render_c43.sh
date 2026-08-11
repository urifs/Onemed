cd /home/user/Onemed/remotion-video
lane() {
  for id in "$@"; do
    echo "▶ $id"
    npx remotion render src/index.ts $id out/creatives/onemed-${id,,}.mp4 --log=error --concurrency=2 \
      && echo "✔ $id ($(du -m out/creatives/onemed-${id,,}.mp4 | cut -f1)M)" || echo "✖ $id FALHOU"
  done
}
lane C43-Recibo C45-ZoomInf C47-DiaNoite C49-Print C51-Rebobinar C53-Trailer C55-Plano C57-Lofi C59-Boot C61-Foco &
A=$!
lane C44-Zapping C46-Cafe C48-Perguntas C50-TesteCego C52-Dossie C54-Top5 C56-Documentario C58-Vespera C60-Numeros C62-Finale &
B=$!
wait $A $B
echo RENDER_C43_DONE
