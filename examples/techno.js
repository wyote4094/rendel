// "techno" — high complexity
// Dark techno: layered synth drums, sub bass, filtered mid bass, sparse lead
setcps(1.75)
stack(
  // kick — four on the floor
  note("c1*4").s("sine").decay(0.18).sustain(0).gain(1),
  // snare + clap (two detuned voices)
  note("~ [c3, e3] ~ [c3, e3]").s("sawtooth")
    .hpf(2000).decay(0.1).sustain(0).shape(0.4).room(0.1).gain(0.85),
  // closed hi-hat alternating 8/16ths
  note("c6*<8 16>").s("triangle").hpf(8000).decay(0.03).sustain(0)
    .gain(0.45).pan(rand.range(-0.4, 0.4)),
  // open hat on offbeats
  note("~ c6 ~ c6").s("triangle").hpf(6000).decay(0.2).sustain(0)
    .gain(0.35).room(0.2),
  // sub bass
  note("[c1*2 ~ c1 ~ eb1 ~ f1 ~]").s("sine").gain(0.85),
  // mid bass with LPF sweep
  note("[c2*2 ~ c2 ~ eb2 ~ f2 ~]").s("sawtooth")
    .lpf(sine.range(100, 900).slow(8)).lpq(18)
    .shape(0.5).gain(0.55),
  // sparse lead stab — appears only in some cycles
  note("<c4 eb4 f4 g4>*2").s("square")
    .lpf(1800).room(0.35).delay(0.125)
    .gain(perlin.range(0.3, 0.6))
    .mask("<0 0 1 0>/4")
)
