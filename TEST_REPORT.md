# Test Report

## Automated checks

- `npm run typecheck` — passed.
- `npm run lint` — passed with no lint warnings.
- `npm test -- --runInBand` — 7 suites and 40 tests passed. The run emitted non-fatal React test-renderer `act(...)` warnings from the Node-based UI tests.
- `npx expo install --check` — passed; dependencies are up to date.
- `npx expo export --platform ios` — passed; iOS bundle exported to ignored `dist/`.
- `npx expo export --platform android` — passed; Android bundle exported to ignored `dist/`.
- `npx expo export --platform web` — passed; Metro generated web entry and worker bundles and included the SQLite WASM asset (621 KB). The exported `dist/index.html` contains the requested PWA metadata and CSS from `public/index.html`.
- `npm run web:serve` — passed; `/` and `/asset/MSFT` returned HTTP 200 with COOP, COEP, and CORP headers, and the SQLite WASM asset was served as `application/wasm`.
- `git diff --check` — passed.

## Simulator and Maestro

- The installed app ran on the iPhone 17 simulator (iOS 26.5) supplied for this task. No native rebuild was run.
- The main journey, losing-pick, and restart-persistence Maestro flows passed on that simulator.
- The developer performed the iPhone 17 simulator visual review and found defects that were fixed across two rounds.
- Captured `/Users/devin/shots/fix2-discover.png`, `/Users/devin/shots/fix2-share.png`, `/Users/devin/shots/fix2-allocation.png`, `/Users/devin/shots/fix2-saved.png`, and `/Users/devin/shots/fix2-portfolio.png` using simulator deep links. The default For You deck was captured; without accessibility-driven interaction, an ETF/crypto filter could not be selected, and Allocation could not be explicitly scrolled.
- The floating Expo Tools button was left enabled as permitted for this capture pass.

## Android native build

- The authorized retry of `cd android && ./gradlew assembleDebug` failed after 4 seconds because Maven Central returned HTTP 429 while resolving Kotlin and transitive artifacts. The latest output included:
  `Could not HEAD 'https://repo.maven.apache.org/maven2/org/jetbrains/kotlin/kotlin-stdlib/2.1.20/kotlin-stdlib-2.1.20.pom'. Received status code 429 from server: Too Many Requests`
  The same response blocked `gson:2.8.9`, `guava:31.0.1-jre`, and `javapoet:1.13.0`.
- No APK was generated. Android visual verification is **UNVERIFIED**.

EAS builds were not run. CI was not monitored after pushing, per the requested handoff boundary.
