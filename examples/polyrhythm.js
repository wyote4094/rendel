// "polyrhythm" — high complexity
// Three synth voices in 3:4:5 polyrhythm over a steady bass
setcps(0.8)
stack(
  // quarter-note bass anchor
  note("c2").s("sawtooth").struct("x*4")
    .lpf(400).shape(0.35).gain(0.7),
  // voice A: triplet feel (3-over-4)
  note("<c4 eb4 g4>*3").s("triangle")
    .room(0.4).gain(0.45).pan(-0.5)
    .delay(0.2).delaytime(0.333),
  // voice B: straight 4
  note("<eb4 g4 bb4 c5>*4").s("sine")
    .room(0.5).gain(0.4).pan(0)
    .lpf(sine.range(800, 3000).slow(6)),
  // voice C: quintuplet feel (5-over-4)
  note("<g4 bb4 c5 eb5 f5>*5").s("square")
    .lpf(1500).room(0.6).gain(0.3).pan(0.5)
    .delay(0.15).rarely(ply("2"))
)
