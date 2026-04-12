// "cinematic" — high complexity
// Orchestral mood piece using GM soundfonts: strings, piano, and bass
setcps(0.45)
let harmony = chord("<C- Ab^7 Eb^7 Bb>/4").dict('ireal')
stack(
  // slow string pads
  harmony.voicing().s("gm_string_ensemble_1")
    .room(0.85).gain(0.4),
  // piano counter-melody
  harmony.n("[0 2 4 3]*2").anchor("C5").voicing()
    .s("gm_piano")
    .room(0.5).delay(0.2).delaytime(0.5).gain(0.5),
  // pizzicato accent on beat 1
  harmony.n("0").anchor("C4").voicing()
    .s("gm_pizzicato_strings")
    .struct("x ~ ~ ~").gain(0.55).room(0.4),
  // upright bass root
  harmony.n("0").mode("root:c1").voicing()
    .s("gm_acoustic_bass").gain(0.75)
)
