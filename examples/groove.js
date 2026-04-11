// "groove" — medium complexity
// Kick/snare/hat groove with a synth bass (all synth, no samples)
setcps(0.9)
stack(
  note("c1 ~ c1 ~").s("sine").decay(0.15).sustain(0).gain(1),
  note("~ c3 ~ c3").s("sawtooth").hpf(2000).decay(0.08).sustain(0).shape(0.4).gain(0.8),
  note("[c6 c6] ~ [c6 c6] ~").s("triangle").hpf(6000).decay(0.04).sustain(0).gain(0.45),
  note("[c2 ~ eb2 ~ f2 ~ g2 ~]").s("sawtooth")
    .lpf(700).lpq(4).shape(0.3).gain(0.65)
)
