// ================= curses: either player plays one on the other =================
const CURSES=[
 {n:"Rush Hour",when:"Before their next card",eff:"Their next card's time limit is halved.",dur:"One card",cost:"2 chips",k:"rush",chips:2},
 {n:"Roadblock",when:"Before their next card",eff:"Their next Take or Stunt can't win them the station. Pass it and they keep the chips, but the station goes to auction.",dur:"One card",cost:"2 chips",k:"road",chips:2},
 {n:"Wrong Platform",when:"Before their next hop",eff:"You pick where their next hop goes, from the neighbouring stations.",dur:"One hop",cost:"2 chips",k:"wrong",chips:2},
 {n:"Double Fare",when:"Any time",eff:"Their next buy, bid or buyout costs double.",dur:"One purchase",cost:"2 chips",k:"fare",chips:2},
 {n:"Gilded Station",when:"At a station you own",eff:"Buying it out costs 10, and a card pass there does not take it. Only a buyout does.",dur:"Rest of the day",cost:"2 chips",k:"gilded",chips:2},
 {n:"Second Opinion",when:"Before their next card",eff:"After they pass their next card, they have to find a stranger who agrees with a take of theirs. Three strangers disagree and the card fails.",dur:"One card",cost:"2 chips",k:"second",chips:2},
 {n:"Silent Car",when:"Any time",eff:"They may not speak to a stranger until the doors open at their second stop from now.",dur:"Two stops",cost:"2 chips",k:"silent",chips:2},
 {n:"Jury Duty",when:"Any time",eff:"They may not buy or bid until they record a take from someone under 25 or over 65, asked, not guessed.",dur:"Until done",cost:"3 chips",k:"jury",chips:3},
];

