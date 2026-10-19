# MentaList 1.0: Final pre-submission check

> **Status, 20 October 2026, after this audit:**
> - **Blocker 1 fixed:** the Xcode copy is synced. `privacy.html` and the support email are present in `ios/App/App/public`.
> - **Blocker 2:** pushed to `main`, so GitHub Pages publishes `/privacy.html`.
> - **Blocker 3 remains for the owner:** the developer membership and signing team.
> - **High-risk items fixed:**
>   - Attachments are limited to 25 MB.
>   - An orange replaces the Apple logo list icon.
>   - Reminder sounds are now in the app bundle (they were only in the web folder, so iOS couldn't play them).
> - **Recommended items fixed:**
>   - 44 pt tap areas for switches, Back, Close, Settings and the list delete button.
>   - VoiceOver names for Settings, Celebrate and Edit.
>   - Guide demos hold still with Reduce Motion.
>   - The privacy policy mentions the microphone, drops the sentence about switched-off code, and follows the app's light or dark look.
>   - Shortcut buttons only appear for clear app names and are 44 pt.
>   - The notification status refreshes when you return to the app.
>   - iPhone wording ("Tap return").
>   - Destructive buttons use red-600.
> - **Left as is:**
>   - Text size is capped at 140% to protect the layout.
>   - Firebase stays compiled in but never starts while collaboration is off.
>   - Every change saves at once.
>   - The launch screen is light only.


Audit date: 20 October 2026. I only read the code, the Xcode project and the built files. Nothing in the project was changed. I did not run the app on a device. App Review is done by people, so this check lowers the risk of rejection but can't guarantee approval.

`App.tsx` was being edited while this check ran, so its line numbers may have moved by a few lines. Every reference was re-checked at about 02:10.

---

## 1. Summary

**What the app is.** MentaList is an offline to-do and planner app for iPhone. It's a React 19 + TypeScript web app wrapped in Capacitor 8.
- Bundle ID `com.anukritidua.mentalist`, version 1.0 (1), iPhone only, portrait only, iOS 15 or later.
- Features: tasks, subtasks, lists and Quick Lists, repeating tasks, reminders, morning and evening summary notifications, attachments, themes, History, Hidden tasks, Progress, and the share sheet.
- All data stays on the device: Capacitor Preferences (iOS UserDefaults) and files in the app's own folder.
- There are no accounts, analytics, ads or tracking. Collaboration (Firebase) is compiled in but switched off (`config.ts:6`).

**Overall.** The code is in good shape for 1.0. Every fix listed in the status section of `APP_STORE_REVIEW.md` is present and works as intended (see the table below). Collaboration can't be reached from anywhere in the app. The privacy manifest is complete. Notifications are only requested in context and stay within iOS's 64-notification limit. In-app dialogs have replaced all browser alerts.

What still blocks submission is not the code but **release steps**:
- The copy of the web app inside the Xcode project is five days old. It still has the "[Developer name]" placeholders and no support email.
- The public privacy policy URL returns 404.
- There's still no signing team.

The main code-level risks:
- A very large video attachment could freeze or reload the app.
- The Apple logo is used as one of the list icons.

| Severity | Count |
|---|---|
| Blockers | 3 (all release steps, not code bugs) |
| High | 2 |
| Recommended | 9 |
| Nice to have | 7 |

### Fixes from the earlier audit: checked

| Earlier fix | Status | Evidence |
|---|---|---|
| Collaboration off, Firebase never starts | **Done** | `config.ts:6` `collaboration: false`. `services/cloudService.ts:31,37` only calls `initializeApp` when the flag is on and keys exist. `.env.local` has no Firebase keys. |
| Shared with Me hidden | **Done** | `App.tsx:101` `isListShown` filters the sidebar (`:1323`) and Manage Lists (`:3174`). `TaskDetails.tsx:425`, `AddToListsModal.tsx:18` and `repeatService.ts:116` exclude `shared`. The open list isn't saved between launches, so it can't start on `shared`. |
| Bell, account row and invite button hidden | **Done** | Bell: `App.tsx:1588`. Account row: `App.tsx:2814`. Invite button: `App.tsx:2477` passes `onInvite` only when the flag is on, and `TaskDetails.tsx:726,736` hides the button and says "Share". The only other `setShowAccount(true)` calls (`App.tsx:596, 1623`) are reachable only through the hidden bell. |
| Guide doesn't describe collaboration | **Done** | `GuidePages.tsx:202-217` shows "Sharing a task" (share sheet only) when the flag is off. |
| Privacy manifest | **Done and complete** | See section 2, "Privacy manifest check". |
| Camera and microphone purpose strings | **Done** | `Info.plist`: `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`. Both are clear and in plain language. |
| `ITSAppUsesNonExemptEncryption = NO`, `arm64` | **Done** | `Info.plist`. |
| iPhone only, portrait only | **Done** | `project.pbxproj:322,345` `TARGETED_DEVICE_FAMILY = 1`. `Info.plist` lists Portrait only. |
| Privacy policy in the app | **Done in source, not in the build** | `public/privacy.html` is complete. The copy inside the iOS project is the old one with placeholders (Blocker B1). |
| Support email | **Done in source, not in the build** | `GuidePages.tsx:10`. The built bundle has no support email (B1). |
| No "coming soon" text visible | **Done** | The only remaining string is in `CollaborateModal.tsx`, which can't be reached. |
| No pinch-zoom; text follows iPhone text size | **Done (capped)** | `index.tsx:23-33`. The cap is 140% (R1). |
| In-app dialogs replace alert, confirm and prompt | **Done** | No direct `alert(`, `confirm(` or `prompt(` calls remain. `Dialogs.tsx:28-41` uses them only as a fallback before startup finishes. Every destructive confirmation has a title, a verb button and red styling (`App.tsx:870, 1008, 1080, 1098, 1375, 3277`). |
| VoiceOver names on switches and icon buttons | **Mostly done** | All 10 switches have `role="switch"`, `aria-checked` and `aria-label`. Three icon buttons rely only on `title` (R3). |
| Friendly crash screen | **Done** | `index.tsx:50-65`. |
| Microsoft Office viewer removed | **Done** | `TaskViewer.tsx:37-44`. No third-party requests anywhere in the source. |

---

## 2. Findings

### BLOCKERS

#### B1. The app bundle inside Xcode is out of date: it still contains privacy policy placeholders and no support email
- **Guidelines:** [2.1(a)](https://developer.apple.com/app-store/review/guidelines/#app-completeness) (*"placeholder text … should be scrubbed before submission"*) and [5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage).
- **Evidence:**
  - `ios/App/App/public/` was last synced on 15 October at 06:16.
  - `ios/App/App/public/privacy.html` still contains `[Developer name]`, `[Contact email]` and `Effective [Effective date]`. The source file `public/privacy.html` is correct.
  - The built JavaScript (`ios/App/App/public/assets/index-CSG1KM-i.js`) doesn't contain `mentalistishere@gmail.com`, so the Guide's "Write to us" section won't appear.
- **What's wrong:** Xcode packages whatever is in `ios/App/App/public`. Archive now, and the reviewer sees a privacy policy that says "MentaList is made by [Developer name]".
- **Fix:** after the last code change, and right before Product > Archive, run:
  ```
  npm run build && npx cap sync ios
  ```
  Then confirm:
  ```
  grep -c "\[Developer name\]" ios/App/App/public/privacy.html
  ```
  prints `0`, and
  ```
  grep -c mentalistishere ios/App/App/public/assets/*.js
  ```
  prints at least `1`.
- **Effort:** quick.

#### B2. The public privacy policy URL doesn't exist yet (404)
- **Guidelines:** [5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) (*"All apps must include a link to their privacy policy in the App Store Connect metadata field"*) and [2.1(a)](https://developer.apple.com/app-store/review/guidelines/#app-completeness) (*"fully functional URLs"*). A Support URL is also required ([1.5](https://developer.apple.com/app-store/review/guidelines/#developer-information)).
- **Evidence:**
  - `https://anukritidua12-collab.github.io/Mentalist-app/privacy.html` returned HTTP 404 on 20 October. The site root returns 200, but it's an older build.
  - `public/`, `ios/`, `config.ts` and most new components are uncommitted (`git status`).
  - `.github/workflows/deploy.yml` only publishes what's pushed to `main`.
- **Fix:**
  1. Commit and push to `main`, and wait for the "Deploy to GitHub Pages" action to finish.
  2. Open the privacy URL in a browser.
  3. Put it in App Store Connect > App Privacy > Privacy Policy URL.
  4. For the Support URL, use a page that shows the support email. The simplest option is to add a small `public/support.html` with the email and a link to the policy.
- **Effort:** quick.

#### B3. No signing team in the Xcode project
- **Guideline:** [Apple Developer Program](https://developer.apple.com/programs/) (needed to upload).
- **Evidence:** `ios/App/App.xcodeproj/project.pbxproj` has no `DEVELOPMENT_TEAM` setting for the App target (lines 302-347). This is the same open item as before.
- **Fix:**
  1. Once the paid membership is active, go to Xcode > App target > Signing & Capabilities and choose your Team.
  2. Register the bundle ID and create the App Store Connect record.
  3. Build with **Xcode 26 or later and the iOS 26 SDK** (required for uploads since 28 April 2026).
- **Effort:** quick, once enrolment is approved.

---

### HIGH

#### H1. A large video or file attachment can freeze or reload the app
- **Guideline:** [2.1(a)](https://developer.apple.com/app-store/review/guidelines/#app-completeness) (*"We will reject … binaries that crash or exhibit obvious technical problems"*).
- **Evidence:**
  - `components/TaskDetails.tsx:687`: `<input type="file">` has no `accept` filter, so iOS offers "Take Photo or Video" and lets you pick any video or file.
  - `components/TaskDetails.tsx:270-284` has no size check.
  - `services/attachmentService.ts:37-43, 47-56, 58-70`: the whole file is read into memory as text (a base64 "data URL", about 1.33 times the file size), then sent across the Capacitor bridge in one piece.
- **What's wrong:** a one-minute 4K video is roughly 350-400 MB. That becomes a string of more than 500 MB, copied at least twice. The web view's memory limit is likely to be exceeded, and the screen goes white or the app reloads. A reviewer testing "Take Photo or Video" could hit this.
- **Fix (pick one or both):**
  - Reject files over about 50 MB before reading them. In `handleFileUpload`, check `if (file.size > 50 * 1024 * 1024)` and show `dialogs.alert({ title: 'That file is too large', message: 'Attach files up to 50 MB.' })`.
  - Limit the picker to what the viewer handles well: `accept="image/*,application/pdf,text/plain"`. This also removes "Video" from the camera menu.

  Then test on a real iPhone with a long video.
- **Effort:** quick.

#### H2. The Apple logo is used as a list icon
- **Guideline:** [5.2.1](https://developer.apple.com/app-store/review/guidelines/#intellectual-property) (*"Don't use protected third-party material such as trademarks … without permission"*). Apple's trademark guidelines also don't allow the Apple logo in apps.
- **Evidence:**
  - `components/AppIcons.tsx:4, 18`: `apple: AppleLogo`, Phosphor's Apple Inc. logo, intended as a fruit.
  - It appears in the icon picker (`App.tsx:~3220`), is chosen at random for new lists (`App.tsx:694`), and old 🍎 lists are mapped to it (`AppIcons.tsx:33`).
- **What's wrong:** reviewers do flag the Apple logo inside third-party apps. It's an easy rejection to avoid.
- **Fix:** replace it with a real fruit icon such as `Orange`, `Cherries` or `Carrot` (all in `@phosphor-icons/react`). Keep the key `apple` so saved lists still map to an icon.
- **Effort:** quick.

---

### RECOMMENDED (HIG and quality)

#### R1. Text stops growing at 140% of normal size
- **HIG:** [Accessibility > Larger text](https://developer.apple.com/design/human-interface-guidelines/accessibility): *"Ideally, give people the option to enlarge text by at least 200 percent."*
- **Evidence:** `index.tsx:29` limits the text-size multiplier to between 0.85 and 1.4.
- **Fix:** test at the largest Accessibility text sizes, and raise the cap towards 2.0 where the layout allows (at least for task names and notes). Not a rejection reason by itself.
- **Effort:** moderate.

#### R2. Some controls are smaller than Apple's tap-target sizes
- **HIG:** [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). On iOS the default control size is 44×44 pt and the minimum is 28×28 pt.
- **Evidence:**
  - All 10 Settings switches are `w-11 h-6`, which is 44×24 pt, below the 28 pt minimum height. Only the switch is tappable, not the row (for example `App.tsx:~2661-2670`, Rotating quotes).
  - The header Settings button is `size="icon"` (`p-2`), about 38 pt (`App.tsx:~1692-1700`).
  - Panel Back buttons use `p-2` with a 20 px icon, about 36 pt (`App.tsx:~3106`, plus the Lists and Appearance headers).
  - The Manage Lists delete button is `w-8 h-8`, 32 pt (`App.tsx:~3251-3260`).
  - The attachment preview close button (`TaskViewer.tsx:~265`) is about 36 pt.
- **Fix:**
  - Give icon buttons `min-w-11 min-h-11` (44 px).
  - Make each switch row a `<label>` or button that toggles the switch, or give the switch an invisible 44 pt hit area (for example `relative` plus an `::after` pseudo-element with `inset:-10px`).
- **Effort:** quick.

#### R3. Three icon-only buttons have no explicit VoiceOver name
- **Evidence:**
  - Settings button `App.tsx:~1692` (only `title="Settings"`).
  - Floating celebrate button `App.tsx:~3396` (only `title="Celebrate"`).
  - Task viewer edit button `components/TaskViewer.tsx:~92-100` (only `title`).
- **What's wrong:** WebKit usually falls back to `title`, but not reliably. The Settings button is the main way into the app's settings.
- **Fix:** add `aria-label="Settings"`, `aria-label="Celebrate"` and `aria-label="Edit task"`.
- **Effort:** quick.

#### R4. The Guide's animations loop forever and ignore Reduce Motion
- **HIG:** [Accessibility > Motion](https://developer.apple.com/design/human-interface-guidelines/accessibility): *"reducing automatic and repetitive animations"* when Reduce Motion is on.
- **Evidence:**
  - `themes.css:742-822`: every `.guide-*` demo animation is `infinite`.
  - The only Reduce Motion rule (`themes.css:688-695`) covers the theme scene, not the Guide or the slide-in panels.
  - Confetti still forces `disableForReducedMotion: false` (`App.tsx:801`). The earlier audit recorded this as your choice; it's noted here only for completeness.
- **Fix:** inside `@media (prefers-reduced-motion: reduce)`, set `.guide-demo * { animation: none !important; }`. Also set a static end state for the elements that start hidden: `.guide-qa-new`, `.guide-rename-input` and `.guide-avatar` need `opacity:1; max-height:none; transform:none`. Turn `slideInRight` into a plain fade.
- **Effort:** quick.

#### R5. Small corrections to the privacy policy
- **Guideline:** [5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage). I checked every statement against the code. None is contradicted, with these small gaps:
  - **Microphone isn't mentioned.** `Info.plist` declares `NSMicrophoneUsageDescription` (for recording a video attachment), but `public/privacy.html:80` lists only "Photos, camera and files". Change it to "Photos, camera, microphone and files … the photo or video you take …". Not needed if you apply the `accept` filter from H1 and remove the microphone string.
  - **"Includes software for an optional task-sharing feature that is switched off"** (`privacy.html:75`). This is true: the Firebase SDK is in the bundle (`index-CSG1KM-i.js` contains `firestore.googleapis.com` and `identitytoolkit`) but never starts. However, it invites a reviewer to ask where that feature is. If you take Firebase out of the 1.0 build (R7), delete this sentence. Otherwise leave it, because it's honest.
  - **Statements I verified as true:**
    - No network requests: no `fetch`, XHR or WebSocket in the source, and Firebase isn't started.
    - Data is stored on the device: Preferences/UserDefaults (`services/storageService.ts`) and attachments in the app's Data folder (`services/attachmentService.ts:19,49-54`).
    - Reminders and summaries are local notifications (`services/reminderService.ts:296-315`).
    - Sharing only goes through the share sheet (`services/shareService.ts:17-19`, `attachmentService.ts:98`).
    - Links open in other apps through iOS (Capacitor `WebViewDelegationHandler.swift:107-113, 328-331`).
    - There are no accounts, analytics or tracking.
- **Effort:** quick.

#### R6. Make the privacy policy easier to find and to read in dark mode
- **Evidence:**
  - The main Settings link is 12 px grey text (`text-xs text-slate-400`, about 2.6:1 contrast on white) in the footer (`App.tsx:~3062-3070`).
  - The policy page picks light or dark from the **phone's** setting (`privacy.html:19`), but the app can be dark when the phone is light (chosen dark mode, or the Midnight, Twilight and Ink themes). In that case the policy shows as a bright page inside a dark panel (`App.tsx:~3097`).
- **Fix:**
  - Add a normal "Privacy policy" row next to Guide, with the same style as Guide.
  - Pass the app's mode to the frame (`privacy.html?embedded&dark=1`), and in `privacy.html` add a `.dark` class when `dark=1` is present.
- **Effort:** quick.

#### R7. Leave Firebase and the collaboration screens out of the 1.0 build
- **Guideline:** [2.3.1](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata) (features should be clear and accessible to review) and 4.2 (cleanliness).
- **Evidence:**
  - `App.tsx:13, 42-45` and `components/CollaborateModal.tsx` import Firebase statically. The 1.5 MB bundle includes Firebase Auth and Firestore, and the "Collaboration is coming soon" text.
  - The code can't be reached, but it's dormant code in the binary.
- **Fix:** load `CollaborateModal` and `cloudService` with `React.lazy` / `import()` only when `FEATURES.collaboration` is true. Vite then removes them from the 1.0 bundle. Alternatively, keep them on a separate branch. Low risk either way; it also shrinks the app.
- **Effort:** moderate.

#### R8. "Smart link" buttons have misleading labels and appear too often
- **Guideline:** [2.1](https://developer.apple.com/app-store/review/guidelines/#app-completeness) (features should work as labelled) and HIG [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons).
- **Evidence:** `services/smartLinkService.ts:12-66` and `components/TaskDetails.tsx:360-372`.
  - Very common words show coloured action buttons in the task editor. Examples: "at" (any "Meet Sam at 5") shows **Open Maps**; "text" and "message" show **Send WhatsApp**; "post" shows Open Instagram; "connect" and "profile" show Open LinkedIn; "watch" and "video" show Watch Video.
  - The buttons only open a home page: "Send WhatsApp" goes to `https://wa.me` with nothing to send, and "Watch Video" goes to youtube.com.
  - The email shortcut is named "Gmail" (`smartLinkService.ts:13`) but opens Apple Mail.
- **What's wrong:** a reviewer typing an ordinary task sees a "Send WhatsApp" button that doesn't send anything. It looks broken.
- **Fix:**
  - Remove the generic words (`at`, `text`, `message`, `post`, `connect`, `profile`, `watch`, `video`, `listen`, `song`) and keep only the app names.
  - Rename the buttons to "Open WhatsApp", "Open YouTube", "Open Mail" and so on.
  - Change `app: 'Gmail'` to `'Mail'`.
- **Effort:** quick.

#### R9. The notification status doesn't update after turning notifications on in iPhone Settings
- **Evidence:**
  - `App.tsx:223` reads the permission once at launch.
  - `App.tsx:347-351` (resume) re-schedules reminders but doesn't refresh `notificationPermission`.
  - So if someone turns notifications on in iOS Settings and comes back, Settings and the task editor still say "Off. Turn on in iPhone Settings" until the app is restarted. Reminders themselves are scheduled correctly, because `scheduleNative` checks the permission again (`reminderService.ts:284`).
- **Fix:** in the resume listener, also call `reminderService.getPermissionState().then(setNotificationPermission)`.
- **Effort:** quick.

---

### NICE TO HAVE

- **N1. "Press Enter" on iPhone.** `App.tsx:93` and `:~2177`, plus the Guide (`GuidePages.tsx:164,166`). The iPhone key says "return" (or "done" or "next"). Use "press return" in the native app, or "tap return". Quick.
- **N2. The Guide talks about computers and browsers inside the iPhone app.** Examples: `GuidePages.tsx:158` ("works the same on iPhone and on a computer"), `:177` ("Hover over it"), `:183` and `:84` ("double-click on a computer"), and `:195` ("On a computer … in your browser"). These are accurate, but they remind the reviewer that this is a website too (4.2). Hide the computer-specific lines when `Capacitor.isNativePlatform()`. Quick.
- **N3. The red destructive button has slightly low contrast.** White text on `bg-red-500` (`Dialogs.tsx:153`) is about 3.8:1. Use `bg-red-600` (about 4.8:1). Quick.
- **N4. The version number is typed into the code.** `GuidePages.tsx:12` `APP_VERSION = '1.0'` matches `MARKETING_VERSION = 1.0` today. Remember to change both for 1.0.1, or read it from `App.getInfo()`. Quick.
- **N5. Leftover debug logging.** `index.tsx:75, 84` call `console.log`. Harmless; remove when convenient. Quick.
- **N6. Everything is saved on every keystroke.** `App.tsx:312-336` writes 16 Preferences keys, including the whole task list, on each change. That's fine at 1.0 sizes, but debounce it (about 300 ms) if lists get large. Moderate.
- **N7. Launch screen.** It's light only, as you decided (`LaunchScreen.storyboard`, `Splash.imageset`). The splash image is centred and survives the aspect-fill crop on every iPhone shape. No change needed for 1.0.

---

## Privacy manifest check (`ios/App/App/PrivacyInfo.xcprivacy`)

I searched the native source of the app, every Capacitor plugin and both Swift packages for each category on Apple's current required-reason list. That list was re-read on 20 October from Apple's `NSPrivacyAccessedAPIType` documentation.

| API category | Used by | Declared | Correct reason |
|---|---|---|---|
| User defaults | `@capacitor/preferences` 8.0.1: `Preferences.swift:18-19`, `PreferencesPlugin.swift:89,93,112,114` | Yes | **CA92.1**, "information that is only accessible to the app itself". Correct. |
| File timestamp | `@capacitor/filesystem` 8.1.4 → `ion-ios-filesystem` 2.0.0 `IONFILEManager.swift:165` (`attributesOfItem`), `IONFILEItemAttributeModel.swift:21-22` (`creationDate`, `modificationDate`) | Yes | **C617.1**, "files inside the app container". Correct: the app only uses `Directory.Data` (`attachmentService.ts:19,52,80,88`). |
| System boot time | Not used by any plugin, core or the app | Not needed | |
| Disk space | Not used | Not needed | |
| Active keyboards | Not used | Not needed | |

Also checked:
- `@capacitor/app`, `haptics`, `local-notifications`, `share`, `status-bar` and `text-zoom` (`TextZoom.swift` only reads `UIFont.preferredFont`) use none of these APIs.
- Capacitor and Cordova core ship their own empty manifests (`Capacitor.framework/PrivacyInfo.xcprivacy`, `Cordova.framework/PrivacyInfo.xcprivacy`).
- `ion-ios-filesystem` has no manifest of its own, but it's built from source as a static library into your app, so your app's manifest covers it.
- `NSPrivacyTracking = false`, no tracking domains, and `NSPrivacyCollectedDataTypes` is empty. This matches "Data Not Collected".
- The manifest is in the App target's Resources build phase (`project.pbxproj:12, 152`).

## Notifications check

- **Asked only in context:**
  - Setting a reminder time (`TaskDetails.tsx:164, 599`)
  - The "Allow" hint in the task editor (`TaskDetails.tsx:313`)
  - "Allow" in Settings (`App.tsx:~2909`)
  - Switching on a morning or evening summary (`App.tsx:~2912`)
  - "Send test notification" (`reminderService.ts:207`)

  At launch the app only *reads* the status (`App.tsx:223`). Summaries are off by default (`dailySummary.ts:16-21`). No marketing content, so this complies with 4.5.4.
- **64-notification limit respected:**
  - At most 60 scheduled: up to 14 summaries (7 days × 2) plus task and subtask reminders filling the rest (`reminderService.ts:33-34, 293`). The test notification adds 1, for a maximum of 61.
  - Before each re-schedule, the app's own pending notifications are cancelled (`:286-290`).
  - The ID ranges don't overlap: tasks use 1 to 2,147,000,000, the test uses 2,147,480,000, and summaries use 2,147,480,100 to 2,147,480,113.
- **Subtask reminders** are included (`reminderService.ts:63`). Tapping one opens the subtask (recursive `findTask`, `App.tsx:1166-1175`).
- **Repeating tasks:** the next occurrence keeps the reminder time and gets its own date (`repeatService.ts:111-117`), so it's scheduled automatically.

## Info.plist check

| Key | Used? | Verdict |
|---|---|---|
| `NSCameraUsageDescription` | Yes: the file picker offers "Take Photo" | Keep |
| `NSMicrophoneUsageDescription` | Yes: "Take Video" records sound | Keep. You can remove it only if you add `accept="image/*,…"` (H1) so video recording is no longer offered. |
| `NSPhotoLibraryUsageDescription` | Not needed: the picker uses Apple's private photo picker | Correctly absent |
| Notifications | Need no plist key | |
| `ITSAppUsesNonExemptEncryption = NO` | Correct: no networking at all in 1.0 | Keep |
| `UIRequiredDeviceCapabilities = arm64` | | Correct |
| `UISupportedInterfaceOrientations = Portrait` | | Correct |
| Background modes, entitlements | None present, none needed | Correct |
| No unused usage descriptions | | Correct |

The app icon (`AppIcon-512@2x.png`) is 1024×1024 RGB with **no alpha channel**, a single universal entry, and no UI screenshot in it. That's correct.

---

## 3. Needs a manual check (on a real iPhone)

1. **Attachments:**
   - Photo Library: if a HEIC photo arrives, does it show on iOS 15 and 16?
   - Take Photo, and a long video (H1).
   - Choose File with a PDF, then preview it and use Save / Share.
2. **Xcode privacy report:** go to Product > Archive > Organizer, right-click the archive and choose "Generate Privacy Report". Confirm only UserDefaults and FileTimestamp appear.
3. **Largest text sizes** (Settings > Accessibility > Larger Text): check nothing is cut off at the 140% cap (R1).
4. **iPhone SE (4.7-inch):**
   - Task editor with the keyboard open.
   - New-list dialog with the keyboard open.
   - Whether the floating celebrate button covers the last task or the Quick add row.
5. **Contrast in every theme,** especially grey subtitles (`text-slate-400` on white is about 2.6:1). Use Xcode's Accessibility Inspector.
6. **Mail links:** "Write to us" in the Guide and the email link in the privacy policy should open Mail. If Mail isn't installed, iOS offers to restore it.
7. **Reminders with the app closed:** a task reminder, a subtask reminder, morning and evening summaries, and a reboot; then tap each one.
8. **App name availability:** a similar-sounding mentalism app, "Menta List Reborn", is on the App Store. Reserve "MentaList" in App Store Connect early. If it's taken, use a variant such as "MentaList: Tasks & Reminders".
9. **VoiceOver pass:** add a task, complete it, open Settings, toggle a switch, and delete a list.

---

## 4. App Store Connect checklist

- [ ] Paid membership, signing team, bundle ID registered (B3). EU trader status declared.
- [ ] Build with **Xcode 26 or later and the iOS 26 SDK**. A deployment target of iOS 15 is fine (the minimum is iOS 13 since 9 September 2026).
- [ ] Run `npm run build && npx cap sync ios` immediately before archiving (B1).
- [ ] **Privacy Policy URL** live, the same page as in the app (B2).
- [ ] **Support URL** live, with `mentalistishere@gmail.com`.
- [ ] **App Privacy:** "**Data Not Collected**". Apple's definition: data processed only on the device isn't "collected". Tracking: No.
- [ ] **Age rating questionnaire:** no user-generated content, messaging, web browsing or purchases in 1.0. Expect the lowest rating.
- [ ] **Screenshots** (6.9-inch iPhone) from the real 1.0 build. No collaboration, no "Shared with Me", no bell.
- [ ] **Description and keywords:** don't mention sharing with collaborators, accounts, AI or sync. "Share a task by message or email" is fine.
- [ ] **App Review Notes** (be specific, per 2.3.1):
  - "No account needed; all data stays on the device."
  - "To see a reminder: Settings > Reminders > Send test notification, or give a task a reminder a minute ahead and lock the phone."
  - "Morning and evening summaries are opt-in under Settings > Reminders."
  - "Repeating tasks: Task details > Schedule > Repeats."
  - Native features: local notifications, haptics, the share sheet, on-device files.
- [ ] **Export compliance:** the app answers "No" automatically through `ITSAppUsesNonExemptEncryption`.
- [ ] **Sign in with Apple:** not applicable (no login in 1.0).
- [ ] **Pricing:** Free. Category: Productivity. Copyright line: "2026 Anukriti Dua".

---

## 5. What's already good (don't change these)

- Collaboration is cleanly isolated behind one flag, with no path to it in the UI.
- The privacy manifest is complete and correct, with no tracking and no collected data.
- Notification permission is requested in context, summaries are opt-in, and the 64-notification limit is handled carefully.
- In-app dialogs have proper titles, verb buttons, "Cancel" and red destructive buttons. Deleted items go to History first.
- It works fully offline, with fonts bundled, no third-party requests and no secrets in the bundle.
- iPhone-only, portrait-only configuration; safe areas respected; status bar matched to the theme; dark mode supported.
- The crash screen is friendly and offers a reload.
- The Guide accurately describes 1.0. I checked every feature it names against the code: Quick lists, Repeating tasks, Plan ahead, Suggested, Move done tasks down, Hide completed tasks (Right away / 1 hour / … / Never), History, Manage Lists, Hidden, Search History & Hidden, Carry forward, the reminder and summary settings, Send test notification, nine themes with Midnight, Twilight and Ink as dark themes, Rotating quotes, Progress, and Share details. Nothing it promises is missing.
- The project type-checks cleanly (`npx tsc --noEmit` passed on 20 October).

---

## 6. Sources (fetched 20 October 2026)

- App Store Review Guidelines (1.5, 2.1(a), 2.3.1, 2.3.10, 2.5.2, 4.2, 4.5.4, 5.1.1(i), (ii), (iv), 5.2.1, 5.2.5): https://developer.apple.com/app-store/review/guidelines/
- Upcoming requirements (Xcode 26 / iOS 26 SDK since 28 April 2026; iOS 13 minimum target since 9 September 2026; required reasons since 1 May 2024): https://developer.apple.com/news/upcoming-requirements/
- Describing use of required reason API, and the `NSPrivacyAccessedAPIType` reference (all categories and reason codes, including CA92.1 and C617.1): https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- App privacy details (the definition of "collect"; on-device processing isn't collection): https://developer.apple.com/app-store/app-privacy-details/
- HIG Accessibility (iOS controls: 44×44 pt default, 28×28 pt minimum; 4.5:1 contrast up to 17 pt; text enlargement "at least 200 percent"; Reduce Motion): https://developer.apple.com/design/human-interface-guidelines/accessibility
- Offering account deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/ (not applicable, because 1.0 has no accounts)

No rule in the brief conflicted with Apple's current pages.
