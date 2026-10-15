# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Supabase database setup

In the Supabase SQL Editor, run `supabase/schema.sql` first to create the shared
database objects. Then run the role-specific scripts you need:

- `supabase/customer-schema.sql` for customer profile and vehicle fields.
- `supabase/mechanic-schema.sql` for mechanic type and private CNIC storage.

The schema scripts are safe to re-run. Mechanic CNICs are stored in
`mechanic_private_details`, separate from the publicly readable mechanic profile
table. `schema.sql` also creates service categories and admin activity logs, and
protects administrator roles and mechanic verification status from self-edits.
Only trusted accounts explicitly promoted by an administrator should receive
the `admin` role; public registration cannot create administrators.

## Gemini vehicle assistant

The customer assistant calls Gemini through the authenticated
`supabase/functions/vehicle-assistant` Edge Function. The Gemini API key is never
included in the mobile/web bundle. Configure the secret in Supabase:

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
supabase functions deploy vehicle-assistant
```

Optionally set `GEMINI_MODEL` to a Gemini model enabled for your API project.
Run `supabase/vehicle-assistant.sql` once in the Supabase SQL Editor to install
the per-user limit of 12 assistant requests per hour before using the feature.
Conversation messages are kept in screen memory only and are not stored in
Supabase. Only the current vehicle details, selected service, conversation turns,
and optional adapter readings are sent to the Edge Function. The assistant has
no CSV knowledge base and labels its suggestions as possibilities.

## OBD-II support

The OBD-II diagnostics screen is separate from the AI assistant. It supports:

- Android: paired Bluetooth Classic SPP adapters. Pair the adapter in Android
  Bluetooth Settings, grant Nearby devices permission, then select it in the app.
- iOS: BLE adapters exposing the FFE0/FFE1 GATT serial profile or Nordic UART.
- Web: BLE adapters exposing those same GATT serial profiles in a secure browser
  context with Web Bluetooth support.

The native Bluetooth modules require a custom Expo development/native build;
Expo Go does not include them. After changing the native dependencies or Expo
Bluetooth configuration, regenerate and build the native project (for example, with
`npx expo run:android` on a configured Android development machine). iOS native
builds require macOS/Xcode or a remote EAS Build. Install the resulting build
before testing Bluetooth.
Adapter and vehicle support varies by parameter. The screen reads standard live
PIDs and stored, pending, and permanent DTCs where returned; it never clears
codes. Adapter readings can be explicitly shared with Gemini, but are not
persisted. Generic mode does not provide manufacturer-specific freeze-frame
data.

## Available-mechanics map

The customer mechanics screen uses Google Maps on native builds and live
foreground GPS. Mechanics are read from the existing `mechanic_profiles` table
(not a separate `mechanics` table), and only approved, available profiles with
coordinates are shown. Customers can filter by vehicle type, select a pin to
view the mechanic's details, and start an assistance request with that mechanic
preselected.

Set `GOOGLE_MAPS_API_KEY` in the local build environment before generating a
native build. Enable the Google Maps Android SDK and Maps SDK for iOS for that
key, and restrict it to this app's Android package/signing certificate and iOS
bundle identifier. The key is embedded in the native application by the Expo
config plugin, so it must be a client key restricted by platform/API; do not use
a server-side unrestricted key. Rebuild the native app after changing the key.
Expo Go uses its built-in platform map provider instead of the project's
Google Maps key (on iOS this is Apple Maps); use a custom development or
production build to use Google Maps on both native platforms. The web build
shows the mechanic list without an interactive map.

Requests from the nearby-mechanic flow carry the selected mechanic through the
existing service-request workflow. Database policy permits a selected mechanic
only when their account is approved and currently available. Customers can enter
latitude and longitude manually when device location permission is unavailable.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
