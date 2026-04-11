// "acid" — medium complexity
// Classic acid house: 303-style bassline + four-on-the-floor (synth drums)
setcps(1.4)
stack(
  note("c1*4").s("sine").decay(0.15).sustain(0).gain(1),
  note("~ c3 ~ c3").s("sawtooth").hpf(2000).decay(0.08).sustain(0).shape(0.4).gain(0.7),
  note("c6*8").s("triangle").hpf(6000).decay(0.04).sustain(0).gain(0.4)
    .pan(rand.range(-0.3, 0.3)),
  note("[c2*2 ~ c2 eb2] [f2*2 g2 ~ ab2]").s("sawtooth")
    .lpf(sine.range(150, 2500).slow(4))
    .lpq(25).shape(0.45).gain(0.65)
)
