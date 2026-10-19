# MentaList

A calm, fast to-do list for iPhone and the web. Version 1.0.

Made by Anukriti Dua · mentalistishere@gmail.com

## What it does

- **Today** brings together what needs doing now, with a large date, a progress line and suggestions.
- **Lists** for anything: Work, Personal, your own lists, and **quick lists** (Notes-style checklists).
- **Tasks** with dates, reminder times, priority, subtasks, notes, photos and files.
- **Repeating tasks**: every day, weekday, week, two weeks, month or year. Ticking one off creates the next.
- **Reminders** on iPhone (even when the app is closed) and in the browser, plus an optional **morning summary** and **evening wrap-up**.
- **Ticking off** draws a line through the task; finished tasks gather at the bottom.
- **History** keeps deleted and finished tasks; **Hidden** keeps tasks out of view.
- **Nine themes** (six light, three dark), dark mode, and a **Guide** inside Settings.
- **Share details** sends a copy of a task through any app.
- **Private by design**: everything stays on the device. See `public/privacy.html`.

## Project layout

| Path | What's there |
|---|---|
| `App.tsx` | The app: state, lists, pages, Settings |
| `components/` | Task row, task panel (`TaskDetails`), Task View, Quick List, dialogs, Guide pages, theme scenes, icons |
| `services/` | Storage, attachments, reminders and daily summaries, repeating tasks, suggestions, sharing, collaboration (Firebase) |
| `config.ts` | Feature switches (collaboration is off for 1.0) |
| `constants.tsx`, `themes.css` | Lists, themes, quotes, icons; theme colours and motion |
| `public/privacy.html` | Privacy policy (in the app and on the web) |
| `ios/App` | The Xcode project (Capacitor) |
| `APP_STORE_REVIEW.md`, `APP_STORE_REVIEW_FINAL.md` | App Store and design guideline audits |
| `APP_STORE_LISTING.md` | Name, subtitle, description, keywords and other App Store Connect fields |
| `FIREBASE_SETUP.md` | How to switch on collaboration later |

## Working on it

Needs Node.js and, for iPhone, Xcode.

```
npm install          # once
npm run dev          # web version at http://localhost:3000
npm run typecheck    # TypeScript check
npm run build        # production build into dist/
```

### iPhone

After any change to the web code:

```
npm run build && npx cap sync ios
```

Then open `ios/App/App.xcodeproj` in Xcode and press Run.

### Web version

Pushing to `main` builds and publishes the web version to GitHub Pages (`.github/workflows/deploy.yml`):

- App: https://anukritidua12-collab.github.io/Mentalist-app/
- Privacy policy (for App Store Connect): https://anukritidua12-collab.github.io/Mentalist-app/privacy.html
- Support page (for App Store Connect): https://anukritidua12-collab.github.io/Mentalist-app/support.html

## Releasing to the App Store

1. Join the Apple Developer Program, then in Xcode choose your **Team** under *App → Signing & Capabilities*.
2. In App Store Connect, create the app with bundle ID `com.anukritidua.mentalist`.
3. Run `npm run build && npx cap sync ios`, set the Xcode device to **Any iOS Device (arm64)**, then **Product → Archive → Distribute App → App Store Connect → Upload**.
4. Test the build in TestFlight, fill in the listing, and submit. The App Store privacy label is **Data Not Collected**.
5. For each new upload, raise the version (*General → Identity*) and update `APP_VERSION` in `components/GuidePages.tsx` to match.
