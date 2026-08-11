#!/bin/bash
# Renderiza C63-C72 em 2 lanes paralelas (concurrency 2 cada)
cd "$(dirname "$0")"
set -o pipefail

lane_a() {
  for C in C63-Estante C65-Cardapio C67-Tesouro C69-Feira C71-Mudanca; do
    out="out/creatives/onemed-$(echo $C | tr 'A-Z' 'a-z' | sed 's/-/-/').mp4"
    npx remotion render src/index.ts "$C" "$out" --log=error --concurrency=2 \
      && echo "LANE_A_OK $C" || echo "LANE_A_FAIL $C"
  done
  echo "LANE_A_DONE"
}
lane_b() {
  for C in C64-Creditos C66-Trofeus C68-Luta C70-Observatorio C72-Leilao; do
    out="out/creatives/onemed-$(echo $C | tr 'A-Z' 'a-z' | sed 's/-/-/').mp4"
    npx remotion render src/index.ts "$C" "$out" --log=error --concurrency=2 \
      && echo "LANE_B_OK $C" || echo "LANE_B_FAIL $C"
  done
  echo "LANE_B_DONE"
}

lane_a & A=$!
lane_b & B=$!
wait $A $B
echo "RENDER_C63_ALL_DONE"
