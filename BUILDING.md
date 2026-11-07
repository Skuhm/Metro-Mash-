# Building Metro Mash

- `python3 build.py` concatenates `src/*.js` in a fixed order (see build.py) with the CSS into `dist/turf.html` and the web-app copy `site/index.html`. Commit `site/index.html` (copied to the repo root as `index.html`) plus `sw.js` to deploy. Bump the cache name in `sw.js` (`metro-mash-vN`) on every deploy so phones pick up the new version.
- GitHub Pages serves the repo root: https://skuhm.github.io/Metro-Mash-/
- Tests live in `qa/` and run with Playwright (Chromium). The sync tests need the local MQTT broker: `node qa/broker.js 18883 &`. Main suites: `v3_test.js`, `teams_test.js`, `local_test.js`, `cards_new.js`, `home_flow.js`, `render_sweep.js`, `lay_test.js`, `xp_one.js`, `classic_qa.js`.
- Trivia banks: `trivia/*.json` → `python3 make_trivia.py` → `src/trivia.js`.
