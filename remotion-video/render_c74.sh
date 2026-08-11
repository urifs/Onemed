#!/bin/bash
cd "$(dirname "$0")"
lane_a() {
  for C in C75-Quiz C77-Quiz C79-Quiz C81-Quiz; do
    n=$(echo $C | grep -oP '\d+')
    npx remotion render src/index.ts "$C" "out/creatives/onemed-c$n-quiz.mp4" --log=error --concurrency=2 \
      && echo "LANE_A_OK $C" || echo "LANE_A_FAIL $C"
  done; echo "LANE_A_DONE"
}
lane_b() {
  for C in C74-Quiz C76-Quiz C78-Quiz C80-Quiz C82-Quiz; do
    n=$(echo $C | grep -oP '\d+')
    npx remotion render src/index.ts "$C" "out/creatives/onemed-c$n-quiz.mp4" --log=error --concurrency=2 \
      && echo "LANE_B_OK $C" || echo "LANE_B_FAIL $C"
  done; echo "LANE_B_DONE"
}
lane_a & A=$!; lane_b & B=$!; wait $A $B
echo "RENDER_C74_ALL_DONE"
