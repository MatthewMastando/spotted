# Test Report

## Automated checks

- `npm run typecheck` — passed.
- `npm run lint` — passed with no lint warnings.
- `npm test -- --runInBand` — 7 suites and 39 tests passed. The run emitted non-fatal React test-renderer `act(...)` warnings from the Node-based UI tests.
- `npx expo install --check` — passed; dependencies are up to date.
- `npx expo export --platform ios` — passed; iOS bundle exported to ignored `dist/`.
- `npx expo export --platform android` — passed; Android bundle exported to ignored `dist/`.
- `git diff --check` — passed.

## Simulator and Maestro

- The installed app ran on the iPhone 17 simulator (iOS 26.5) supplied for this task. No native rebuild was run.
- The main journey, losing-pick, and restart-persistence Maestro flows passed on that simulator.
- The user performed the simulator visual review and reported the UI defects addressed in this change. Captured `/Users/devin/shots/fix-discover.png`, `fix-saved.png`, `fix-portfolio.png`, `fix-allocation.png`, and `fix-share.png`; each was checked only for nonblankness, not visually inspected.
- The screenshot-only allocation helper opened the route and applied equal split, but could not locate `All lines are eligible` while scrolling (`No visible element found: "All lines are eligible"`). The allocation screenshot was captured after that failed scroll attempt.

## Android native build

- The debug Gradle build did not produce an APK because Maven Central returned HTTP 429 while resolving the Kotlin Gradle plugin BOM:
  `Could not GET 'https://repo.maven.apache.org/maven2/org/jetbrains/kotlin/kotlin-gradle-plugins-bom/2.1.20/kotlin-gradle-plugins-bom-2.1.20.pom'. Received status code 429 from server: Too Many Requests`
- No APK was generated. Android visual verification is **UNVERIFIED**.

EAS builds were not run. CI was not monitored after pushing, per the requested handoff boundary.
