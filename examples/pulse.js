// "pulse" — low complexity
// A single sawtooth bass note with a slow LPF sweep
setcps(0.5)
note("c2").s("sawtooth")
  .lpf(sine.range(200, 1200).slow(4))
  .lpq(8).shape(0.3).gain(0.8)
