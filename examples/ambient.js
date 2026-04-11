// "ambient" — medium complexity
// Slowly evolving pads with shimmer delay
setcps(0.35)
stack(
  note("<c3 ab2 eb3 f3>/4").s("sine")
    .gain(0.45).room(0.9)
    .delay(0.6).delaytime(0.75).delayfeedback(0.4),
  note("c4 eb4 g4 bb4").s("triangle")
    .slow(8).room(0.8).gain(0.3)
    .lpf(sine.range(400, 1800).slow(16)),
  note("<c2 ab1 eb2 f2>/8").s("sine")
    .gain(0.5).room(0.6)
)
