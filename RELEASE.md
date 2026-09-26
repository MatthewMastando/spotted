# Release and build notes

## EAS profiles

`eas.json` defines:

- `development`: development client, internal distribution, iOS simulator build.
- `preview`: internal Android APK.
- `production`: Android app bundle and iOS store distribution.

The profiles are configuration only; no EAS build has been run for this release-work change.
Before a real build, install and authenticate the EAS CLI, verify the Expo project and bundle
identifiers, and provision the relevant Apple Developer / App Store Connect and Google Play
credentials. Keep credentials in EAS or CI secret storage, never in the repository.

Example commands, to run only after credentials and project configuration are ready:

```sh
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

## Local native builds

The project uses Continuous Native Generation. Native project directories are generated and ignored:

```sh
npx expo prebuild --no-install
cd ios && pod install
cd ../android && ./gradlew assembleDebug
```

Use the generated app identifiers from `src/config/brand.ts`. The app uses `com.swipefolio.app` on
both platforms.

## Store checklist

- Confirm the production application identifiers, version, app icon, adaptive icon, and splash art.
- Review Apple privacy disclosures and Google Play Data Safety statements for local SQLite,
  clipboard, photo-library export, and analytics-event storage.
- Configure valid signing and App Store Connect / Play Console records.
- Verify accessibility, privacy permissions, export behavior, and platform-specific presentation
  on physical devices.
- Re-run the CI checks and native builds against the exact release commit; the CI exports are bundle
  smoke checks, not signed store artifacts.

## Automation

Maestro flows live in `.maestro/` and target `com.swipefolio.app`. With Maestro and a booted iOS
simulator installed, run:

```sh
maestro test .maestro/main-journey.yaml
maestro test .maestro/losing-pick.yaml
maestro test .maestro/restart-persistence.yaml
```

See `TEST_REPORT.md` for results actually obtained in this environment.
