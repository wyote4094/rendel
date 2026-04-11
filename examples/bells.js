// "bells" — low complexity
// A gentle pentatonic bell melody with reverb and delay
setcps(0.6)
note("<c5 e5 g5 a5 c6 a5 g5 e5>").s("triangle")
  .decay(0.8).sustain(0).gain(0.7)
  .room(0.85).delay(0.5).delaytime(0.375)
