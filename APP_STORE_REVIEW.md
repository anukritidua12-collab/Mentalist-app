# MentaList: App Store Review and HIG Audit

> **Status update, 14 October 2026.** Fixed in the code since this audit:
> - **Collaboration is off for 1.0** (`config.ts`). Firebase never starts. Shared with Me, the bell, the account row and the invite button are hidden, and the Guide no longer describes sharing tasks with other people. This clears B5 and the collaboration-related high-risk items.
> - **Privacy manifest added** (`ios/App/App/PrivacyInfo.xcprivacy`: UserDefaults CA92.1, file timestamps C617.1, no tracking, no data collected) and included in the app.
> - **Camera and microphone purpose text added**, which fixes the "Take Photo" crash.
> - **Info.plist:** `ITSAppUsesNonExemptEncryption = NO`, and `armv7` changed to `arm64`.
> - **iPhone only and portrait only:** `TARGETED_DEVICE_FAMILY = 1`.
> - **Privacy policy:** `public/privacy.html`, shown in the app (Settings → Privacy policy) and served on the web at `/privacy.html`.
> - **No "coming soon" text:** the contact section is hidden until `SUPPORT_EMAIL` is set.
> - **Native feel:** no pinch-zoom in the iPhone app, and text follows the iPhone's text size (capped).
> - **In-app dialogs replace browser alerts:** each has a title, clearly named buttons and a red button for anything destructive.
> - **Accessibility:** every switch has a VoiceOver name and on/off state, icon-only buttons are labelled, and small tap targets are enlarged.
> - **Crash screen:** a friendly message with a Reload button.
> - **Microsoft Office online viewer removed:** no third-party requests.
>
> **Still to do (owner):**
> - Paid Apple Developer membership, and a signing team in Xcode.
> - Fill in the support email (`components/GuidePages.tsx`).
> - Fill in the privacy policy's bracketed details (`public/privacy.html`).
> - Publish the web version so the privacy policy and support pages have public URLs.
> - Screenshots and age rating.
> - App Store privacy label: "Data Not Collected".
>
> **Left as is on purpose:**
> - Confetti ignores Reduce Motion (the owner's choice; it can be turned off in Settings).
> - The launch screen is light only.
> - The app is English only.


Audit date: 14 October 2026. I only read the code and project settings; nothing in the project was changed. I did not run the app on a device. App Review is done by people, so this audit lowers the risk of rejection but can't guarantee approval.

---

## 1. Summary

### What the app is (please correct me if any of this is wrong)

- **MentaList** is a to-do and planner app. You can make tasks with subtasks, notes, due and scheduled dates, reminders, priorities, lists, themes, a progress page, a "Quick List", suggestions and quotes.
- **How it's built:** it's a React 19 + TypeScript web app (built with Vite) that runs inside a native iOS shell (Capacitor 8). The Xcode project is in `ios/App`, the bundle ID is `com.anukritidua.mentalist`, the version is 1.0 (build 1), and the minimum iOS version is 15.0. The project is set to run on **both iPhone and iPad**.
- **Native features used:** local notifications for reminders (permission is asked only when you need it, which is good), storage on the device (Capacitor Preferences, which uses iOS UserDefaults), attachment files kept in the app's own folder (Capacitor Filesystem), haptics (small vibrations), the iOS share sheet, and status bar styling.
- **Data:** everything stays on the device unless collaboration is switched on. There are no analytics, ads or crash-reporting tools, and nothing tracks users.
- **Optional collaboration (Firebase):** this adds email and password accounts (sign up, sign in, email verification, password reset), shared tasks, and invites sent by email address. It sends your name, email address and the content of shared tasks to Google Firebase. It's **turned off in the current build** because there are no Firebase keys. When it's off, the app shows "Collaboration is coming soon". The code is still in the app, and it switches on as soon as the keys are added.
- There's no Google, Apple or other social login, and no in-app purchases or payments.

### Overall readiness

The core to-do app is well made and nearly ready. Data stays on the device, notifications are requested at a sensible moment, it works offline, it supports dark mode and safe areas, and it uses native notifications, haptics and the share sheet. However, **several things will stop you submitting, or get the app rejected, as it stands:**

- You don't have a paid developer membership yet.
- The app doesn't declare why it uses certain iOS features ("required reason" APIs). App Store Connect refuses uploads like this.
- There's no camera permission text, so the app crashes if someone taps "Take Photo" on the attachment picker.
- There's no privacy policy.
- Collaboration is half-finished. Shipped switched off, it shows "coming soon" placeholders. Shipped switched on, it has no account deletion, no way to report or block someone, and no demo account for the reviewer.

Most fixes are quick. The biggest decision is whether **version 1.0 ships without collaboration** (simplest: hide it completely) or **with it** (more work: account deletion, report and block, a privacy policy that covers Firebase, and demo accounts).

### Findings by severity

| Severity | Count |
|---|---|
| Blockers (you can't submit, or the app will be rejected or crash in review) | 5 |
| High risk (reviewers often flag these; fix before submitting) | 7 |
| Recommended (HIG and quality; won't usually cause rejection alone) | 9 |
| Nice to have | 6 |

---

## 2. Findings

### BLOCKERS

#### B1. No paid Apple Developer Program membership, and no signing team set
- **Guideline:** [Apple Developer Program](https://developer.apple.com/programs/) (you need it to use App Store Connect).
- **Evidence:** `ios/App/App.xcodeproj/project.pbxproj` has no `DEVELOPMENT_TEAM` setting for the App target (around lines 300 to 345). You also told me there's no paid membership yet.
- **What's wrong:** you can't create the app record in App Store Connect, upload a build, use TestFlight or submit without the membership (USD 99 a year). The bundle ID `com.anukritidua.mentalist` also has to be registered under your team.
- **Fix:**
  1. Enrol at developer.apple.com/programs. If you enrol as an individual, your personal name appears as the seller.
  2. In Xcode, go to App target > Signing & Capabilities, choose your Team, and keep "Automatically manage signing" on.
  3. Create the app record in App Store Connect with the same bundle ID.
  4. For EU distribution, complete the "trader status" declaration (required under the EU Digital Services Act).
- **Effort:** quick, but enrolment can take a day or two to be approved.

#### B2. No app privacy manifest, though the app uses "required reason" APIs
- **Guideline:** [Describing use of required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) and Guideline 5.1.1 / 5.1.2. Apple says: *"Starting May 1, 2024, apps that don't describe their use of required reason API in their privacy manifest file aren't accepted by App Store Connect."*
- **Evidence:**
  - There's no `PrivacyInfo.xcprivacy` anywhere in `ios/App/App/`.
  - The Preferences plugin, which stores all your tasks, uses `UserDefaults`: `node_modules/@capacitor/preferences/ios/Sources/PreferencesPlugin/Preferences.swift:18-19` and `PreferencesPlugin.swift:89,112`.
  - The Filesystem plugin reads file creation and modification dates: `node_modules/@capacitor/filesystem/ios/Sources/FilesystemPlugin/IONFileStructures+Converters.swift:45-46`.
  - Neither plugin ships its own privacy manifest. Only Capacitor core and Cordova do, and those are empty: `node_modules/@capacitor/ios/Capacitor/Capacitor/PrivacyInfo.xcprivacy`.
  - The plugins are compiled into your app (`ios/App/CapApp-SPM/Package.swift`), so **your app's** manifest has to declare them.
- **What's wrong:** iOS asks apps to say *why* they use certain system features that could be misused to identify a device ("fingerprinting"). If this declaration is missing, the upload is rejected with error ITMS-91053.
- **Fix:** add `ios/App/App/PrivacyInfo.xcprivacy` to the App target in Xcode (File > New > File > App Privacy). It should declare:
  - `NSPrivacyTracking` = false, with no tracking domains.
  - `NSPrivacyAccessedAPITypes`:
    - `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1` (the app reads and writes its own data).
    - `NSPrivacyAccessedAPICategoryFileTimestamp` with reason `C617.1` (files inside the app's own folder).
  - `NSPrivacyCollectedDataTypes`: empty if collaboration is off. If it's on, list Name, Email Address, User ID and Other User Content (see the draft labels in section 4), each marked "linked to user", "not used for tracking", purpose "App Functionality".

  Then go to Product > Archive, and in the Organizer right-click the archive and choose "Generate Privacy Report". Check that no other API category (for example disk space or system boot time) appears without a reason.
- **Effort:** quick.

#### B3. Camera (and microphone) permission text is missing, so tapping "Take Photo" crashes the app
- **Guideline:** 2.1 (App Completeness: *"We will reject … binaries that crash"*) and 5.1.1(ii) (permission purpose strings).
- **Evidence:**
  - `components/TaskDetails.tsx:628` uses `<input type="file" …>` with no `accept` filter.
  - In the iOS web view this opens a menu with **Photo Library / Take Photo or Video / Choose Files**.
  - `ios/App/App/Info.plist` has **no** `NSCameraUsageDescription` or `NSMicrophoneUsageDescription`.
- **What's wrong:** iOS force-closes any app that opens the camera without a camera explanation string. Recording video also needs the microphone string. A reviewer testing attachments is very likely to tap "Take Photo".
- **Fix:** add these to `Info.plist`:
  - `NSCameraUsageDescription`: "MentaList uses the camera so you can take a photo and attach it to a task."
  - `NSMicrophoneUsageDescription`: "MentaList uses the microphone when you record a video to attach to a task."

  Choosing from the photo library uses Apple's private picker, which needs no permission, so `NSPhotoLibraryUsageDescription` isn't strictly needed (see the manual checks). Test all three menu options on a real iPhone.
- **Effort:** quick.

#### B4. No privacy policy, in the app or anywhere else
- **Guideline:** [5.1.1(i) Privacy Policies](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage): *"All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app in an easily accessible manner."*
- **Evidence:** searching all the source code finds no "privacy policy" or "terms" link. Settings (`App.tsx` ~2515-2930), Guide and "Why MentaList" (`components/GuidePages.tsx`) only say "Everything is kept on your device" (GuidePages.tsx ~line 220 and ~line 277).
- **What's wrong:** this is required for **every** app, even one that collects nothing.
- **Fix:**
  1. Publish a short privacy policy page. GitHub Pages works; you already host the web app at `anukritidua12-collab.github.io/Mentalist-app/`.
  2. Say clearly that tasks, attachments and settings stay on the device; that no analytics, ads or tracking are used; and that reminders are scheduled on the device.
  3. If collaboration ships, also say that name, email and shared-task content are stored with Google Firebase. Explain why, how long it's kept, how to delete the account, and that Google protects the data to an equal standard.
  4. Give a contact email.
  5. Add a "Privacy Policy" row in Settings (next to Guide) that opens this page, and put the same URL in App Store Connect.
- **Effort:** quick to moderate (mostly writing).

#### B5. (Only if collaboration ships switched on) Accounts can be created but not deleted
- **Guideline:** [5.1.1(v) Account Sign-In](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) and [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- **Evidence:**
  - `services/cloudService.ts:97-109` creates accounts (`createUserWithEmailAndPassword`).
  - `components/CollaborateModal.tsx:102-127` is the "Create account" screen.
  - The only account action is "Sign out" (`CollaborateModal.tsx:168, 188-190`).
  - There's no `deleteUser` call anywhere.
  - `firestore.rules:23-28` doesn't allow deleting the `userEmails/{email}` record at all.
- **What's wrong:** Apple requires that anyone who can create an account can **delete it from inside the app**: the whole account record and its personal data, including content shared with others. Signing out or deactivating isn't enough, and you can't send people to an email or support process instead.
- **Fix:** add a red "Delete account" button on the Account screen. It should:
  1. Show a confirmation that explains what will be deleted. Ask for the password again, because Firebase requires a recent sign-in.
  2. Delete the user's `userEmails` record (and add an `allow delete` rule for the owner).
  3. Remove the user from `memberUids`, `memberInfo` and `pendingEmails` of every shared task.
  4. Delete shared tasks they own, or hand them over to another member.
  5. Delete invites they sent and received.
  6. Call Firebase `deleteUser()`.
  7. Confirm when it's done.

  A Firebase Cloud Function (server code) is the most reliable way to clean up. If collaboration ships **off**, this isn't a blocker, but see H1.
- **Effort:** moderate.

---

### HIGH RISK

#### H1. "Coming soon" placeholders and a documented feature that doesn't work
- **Guidelines:** [2.1(a)](https://developer.apple.com/app-store/review/guidelines/#app-completeness) (*"placeholder text … and other temporary content should be scrubbed before submission"*) and [2.3.1(a)](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata) (no hidden or dormant features).
- **Evidence:**
  - `components/CollaborateModal.tsx:85`: "Collaboration is coming soon".
  - `App.tsx:2721-2737`: the Settings row "Account & collaboration" says "Not set up yet".
  - `components/GuidePages.tsx:~200-203` teaches "Invite to collaborate" and "Accepting an invite" as if they work. "Why MentaList" (~line 268) says "tasks can be shared".
  - `GuidePages.tsx:227`: "Our support address will appear here soon."
  - `services/aiService.ts` and `services/geminiService.ts` are leftover "AI Service – Placeholder (AI features disabled)" files. These aren't visible to users.
- **What's wrong:** the reviewer will see a feature advertised and then told it's "coming soon". That's a common reason for rejection, and the dormant account and Firebase code counts as a dormant feature.
- **Fix (choose one):**
  - **(a) Ship 1.0 without collaboration.** When `isCloudConfigured` is false, hide the Settings "Account & collaboration" row, the "Invite to collaborate" button and the collaboration sections of the Guide and "Why MentaList". Keep "Share details", which uses the share sheet and works. Add collaboration back in a later update.
  - **(b) Ship with collaboration fully working,** together with B5, H2, H4 and H5.

  Either way, replace the "support address will appear here soon" line with a real contact (see H3).
- **Effort:** quick for (a), substantial for (b).

#### H2. (If collaboration ships) No way to report or block people, and no way to leave a shared task
- **Guideline:** [1.2 User-Generated Content](https://developer.apple.com/app-store/review/guidelines/#user-generated-content). Apps with user content must have filtering, a way to report, a way to block abusive users, and published contact information.
- **Evidence:**
  - `services/cloudService.ts:284-319`: anyone with an account can send an invite to **any email address**. The invite shows the sender's name and a task title they choose freely (`App.tsx:1540-1590`).
  - The only options are Accept and Decline (`App.tsx:1572-1582`). There's no Report and no Block.
  - `leaveSharedTask` exists (`cloudService.ts:242`) but nothing in the app uses it.
  - A collaborator can only **delete the task for everyone** (`App.tsx:944-947`, `1028-1034`), and the rules let any member delete it (`firestore.rules:56`).
- **What's wrong:** invites from strangers are a harassment route: an abusive task title can land in someone's notifications. Reviewers apply 1.2 to shared or social content, and a collaborator who wants out has to wipe everyone else's task.
- **Fix:**
  - Add "Block sender" and "Report" on each invite. Store blocked user IDs, ignore invites from them, and send reports to your support email or a Firestore `reports` collection that you check.
  - Add "Leave this shared task" for non-owners using `leaveSharedTask`, and allow only the owner to delete the task for everyone (update `firestore.rules`).
  - Publish a support contact (H3).
  - Optionally, add a basic word filter on invite titles.
- **Effort:** moderate.

#### H3. No support contact (support URL required; SUPPORT_EMAIL is empty)
- **Guidelines:** [1.5 Developer Information](https://developer.apple.com/app-store/review/guidelines/#developer-information) and 1.2 (published contact information).
- **Evidence:** `components/GuidePages.tsx:9` has `export const SUPPORT_EMAIL = '';`, and lines 225-233 show "Our support address will appear here soon."
- **What's wrong:** App Store Connect requires a **Support URL**, and Apple wants an easy way to contact you from both the app and that URL.
- **Fix:** set `SUPPORT_EMAIL`, and publish a simple support page (for example on GitHub Pages) with the email, a short FAQ and a link to the privacy policy. Use that page as the Support URL.
- **Effort:** quick.

#### H4. (If collaboration ships) The reviewer needs demo accounts and a working backend
- **Guideline:** [2.1(a)](https://developer.apple.com/app-store/review/guidelines/#app-completeness): *"include demo account info (and turn on your back-end service!) if your app includes a login."*
- **Evidence:** sign-in requires a verified email (`CollaborateModal.tsx:144-172`), and invites need a second person (`firestore.rules:16-20`).
- **Fix:**
  - Create **two** verified test accounts (for example reviewer1@ and reviewer2@ addresses you control) and add one pending invite between them.
  - Put both logins in App Review Notes, with steps: "Settings > Account & collaboration > Sign in; open the bell to accept the invite."
  - Make sure the Firebase project is on a plan that won't hit its free limits during review.
  - Also say clearly in the notes that the app works fully without an account.
- **Effort:** quick.

#### H5. (If collaboration ships) Sharing data with Google Firebase needs disclosure and labels
- **Guidelines:** [5.1.2(i)](https://developer.apple.com/app-store/review/guidelines/#data-use-and-sharing) (*"clearly disclose where personal data will be shared with third parties"*) and [App privacy details](https://developer.apple.com/app-store/app-privacy-details/).
- **Evidence:**
  - Name and email are stored in `userEmails` and `memberInfo` (`cloudService.ts:77-80, 213-226, 321-336`).
  - Task title, notes, dates and subtasks are uploaded (`cloudService.ts:173-189`).
  - The in-app text "Everything is kept on your device" (GuidePages.tsx ~220) needs a qualifier once sharing exists.
  - The sign-up screen (`CollaborateModal.tsx:96-100`) doesn't mention where the data goes.
- **Fix:**
  - Add one line on the sign-up screen: "Your name, email and the tasks you share are stored securely with Google Firebase so collaborators can see them," with a link to the privacy policy.
  - Use the draft labels in section 4.
  - Set the manifest's `NSPrivacyCollectedDataTypes` to match (B2).
- **Effort:** quick.

#### H6. iPad is declared as supported, so it will be reviewed and must work there
- **Guideline:** [2.4.1 Hardware Compatibility](https://developer.apple.com/app-store/review/guidelines/#hardware-compatibility) (iPhone apps should run on iPad whenever possible), plus the screenshot requirements.
- **Evidence:**
  - `project.pbxproj:318, 341` has `TARGETED_DEVICE_FAMILY = "1,2"` (iPhone and iPad).
  - `Info.plist:60-66` allows all iPad orientations.
- **What's wrong:** Apple often reviews on an iPad. You'll need 13-inch iPad screenshots, and every screen has to work in all four orientations and in Split View sizes. The layout has `md:` breakpoints, so it was designed with wider screens in mind, but I couldn't confirm how it looks.
- **Fix:** test on an iPad simulator (portrait, landscape and Split View). If you don't want to support iPad yet, change Targeted Device Family to iPhone only. The app will then run on iPad in iPhone compatibility mode and you won't need iPad screenshots.
- **Effort:** quick to decide, moderate to polish.

#### H7. Things that make it feel like a website (risk under 4.2 Minimum Functionality)
- **Guideline:** [4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality): *"Your app should include features, content, and UI that elevate it beyond a repackaged website."*
- **Evidence:**
  - `index.html:6` sets `maximum-scale=5.0, user-scalable=yes`. The whole interface can be pinch-zoomed like a web page, which native apps never allow.
  - Browser dialogs are used for confirmations and naming (`confirm`, `prompt` and `alert` at `App.tsx:944, 1016, 1031, 1295, 1312, 3105, 3122, 3126` and `TaskDetails.tsx:233`). Capacitor shows these as iOS alerts with **no title** and an **"Ok"** button (`node_modules/@capacitor/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift:238-258`).
  - The same app is published as a public website: `services/cloudService.ts:27` uses `https://anukritidua12-collab.github.io/Mentalist-app/` as the default download link sent in invites.
  - On the plus side, it already has native notifications, haptics, the share sheet, on-device files, works offline, and bundles its fonts.
- **What's wrong:** Capacitor apps get 4.2 rejections when they feel like a website. Pinch-zoom and untitled "Ok" alerts are the two most obvious signs.
- **Fix:**
  - Change the viewport to `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`.
  - Replace `confirm`, `prompt` and `alert` with in-app sheets that match your own design (you already have modal components such as `AddToListsModal`), or with a native dialog plugin (`@capacitor/dialog`, which supports titles and button text).
  - Before submitting, set `VITE_APP_DOWNLOAD_URL` to the App Store link, or leave invites out of v1.
  - In App Review Notes, briefly list the native features: local reminders that arrive while the app is closed, haptics, share sheet, offline storage, files.
- **Effort:** quick for the viewport, moderate for the dialogs.

---

### RECOMMENDED (HIG and quality)

#### R1. Confirmation alerts use "Ok" instead of a verb, have no title, and don't show red for destructive actions
- **HIG:** [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) says to use verbs related to the alert text and to use "OK" only in informational alerts.
- **Evidence:**
  - `App.tsx:944` ("Delete?" > Ok), `1016` (Clear history > Ok), `1031` (Delete forever > Ok), `1295` ("Delete this **category**?" while the UI calls them **lists**), and `3105`.
  - Capacitor gives both buttons the default style (`WebViewDelegationHandler.swift:252-258`).
- **Fix:** use your own sheet or `@capacitor/dialog` with a title ("Delete list?"), a red "Delete" button and "Cancel". Change "category" to "list".
- **Effort:** moderate (covered by the H7 work).

#### R2. Custom on/off switches are invisible to VoiceOver
- **HIG:** [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).
- **Evidence:**
  - The settings toggles are empty `<button>`s with no label and no on/off state (`App.tsx:2563-2567, 2585, 2604, 2815`, and others).
  - Only one `aria-pressed`, `aria-checked` or `role="switch"` exists in all of `App.tsx`.
- **What's wrong:** VoiceOver users hear "button" with no name and can't tell whether a setting is on or off.
- **Fix:** add `role="switch"`, `aria-checked={value}` and `aria-label="Carry forward overdue tasks"` (and so on) to each toggle.
- **Effort:** quick.

#### R3. Icon-only buttons with no spoken label
- **Evidence:**
  - The Lists and Appearance back buttons (`App.tsx:2963-2968` and `3147-3152`) have no `aria-label`. The Guide back button at `2942` does it correctly.
  - The attachment viewer close "X" (`components/TaskViewer.tsx:265-267`) has none.
  - The sidebar delete-list trash icon (`App.tsx:1294-1303`) and the reorder handle (`App.tsx:~2992`) rely only on `title`.
  - Overall: `App.tsx` has 52 buttons and 16 labels; `TaskViewer.tsx` has 4 buttons and 0 labels.
- **Fix:** add `aria-label` to every button that shows only an icon. Then test with VoiceOver on the main flows: add a task, complete it, open settings and delete a list.
- **Effort:** quick.

#### R4. Tap targets smaller than 44×44 points
- **HIG:** [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) gives the default control size on iOS as 44×44 pt.
- **Evidence:**
  - The sidebar delete-list button is `p-1` around a small icon, about 24-28 pt (`App.tsx:1299`).
  - The list reorder handle is `p-1.5` with a 16 px icon, about 28 pt (`App.tsx:~2992`).
  - The settings switches are 44×24 pt (`App.tsx:2565`). That's fine if the whole row is tappable, but only the small switch is.
  - Several header icon buttons are `p-2` with 20 px icons, about 36 pt.
- **Fix:** make icon buttons at least `w-11 h-11` (44 px) with the icon centred, and make the whole settings row toggle the switch.
- **Effort:** quick.

#### R5. Text doesn't follow the iPhone's Text Size setting (Dynamic Type)
- **HIG:** [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [Typography](https://developer.apple.com/design/human-interface-guidelines/typography). Apps should support text enlargement of at least 200 percent.
- **Evidence:**
  - `index.html:35-41` fixes the root font size at 16 px, or 15 px on phones.
  - There are 33 hard-coded pixel font sizes (`text-[13px]` and similar) across `App.tsx`, `constants.tsx` and `components/`.
  - In a web view, text ignores the iOS Text Size setting unless the page opts in.
- **Fix:** set the root size from the system, for example `html { font: -apple-system-body; }` and then size text in `rem`. Replace `text-[13px]` with rem-based sizes. Test at the largest accessibility text sizes and fix any truncation.
- **Effort:** moderate.

#### R6. Confetti ignores Reduce Motion
- **HIG:** [Accessibility > Motion](https://developer.apple.com/design/human-interface-guidelines/accessibility). When Reduce Motion is on, apps should reduce automatic and repetitive animations.
- **Evidence:** `App.tsx:794` sets `disableForReducedMotion: false`, which deliberately overrides the setting. Only the theme scene respects it (`themes.css:688-695`). Slide-in panel animations (`App.tsx:~2934`, `slideInRight`) also don't check it.
- **Fix:** set `disableForReducedMotion: true`, and add an `@media (prefers-reduced-motion: reduce)` rule that turns the panel slide and scale animations into simple fades.
- **Effort:** quick.

#### R7. iPhone landscape is allowed, but the side safe areas aren't respected
- **HIG:** [Layout](https://developer.apple.com/design/human-interface-guidelines/layout).
- **Evidence:**
  - `Info.plist:54-59` allows Landscape Left and Right on iPhone.
  - `<body class="safe-top safe-bottom">` (`index.html:105`) pads only the top and bottom. `.safe-left` and `.safe-right` are defined (lines 89-90) but never used.
- **What's wrong:** in landscape, content can sit under the Dynamic Island or notch at the side.
- **Fix:** either lock iPhone to Portrait (remove the two landscape entries from `UISupportedInterfaceOrientations`; leave iPad as is), or add `safe-left safe-right` to `<body>` and test in landscape.
- **Effort:** quick.

#### R8. Crash screen shows raw technical errors and has no way out
- **Guideline:** 2.1 (quality); HIG on feedback.
- **Evidence:** `index.tsx:34-43`. The error boundary shows "Something went wrong" plus `error.toString()` in a code box, and has no button.
- **Fix:** show a friendly message ("Something went wrong. Your tasks are safe on this device.") with a "Reload" button (`location.reload()`), and hide the technical text.
- **Effort:** quick.

#### R9. The launch screen is light-only and has text baked into the image
- **HIG:** [Launching](https://developer.apple.com/design/human-interface-guidelines/launching). The launch screen should look like the app's first screen and avoid text.
- **Evidence:**
  - `ios/App/App/Assets.xcassets/Splash.imageset` contains three identical light images (2732×2732) with the word "MentaList", and no dark-mode version.
  - `LaunchScreen.storyboard:16-19` shows the image full screen, cropped to fill.
- **What's wrong:** in dark mode, users see a bright flash before the dark app appears. On some screen shapes the logo and word may be cropped.
- **Fix:** add a dark-appearance variant to the Splash image set (or use a centred logo only on a plain background colour from the asset catalog), and drop the word.
- **Effort:** quick.

---

### NICE TO HAVE

- **N1. Required device capability says `armv7`.** `Info.plist:50-53` lists `armv7`, an old 32-bit chip. With iOS 15 as the minimum, change it to `arm64` or remove the key. It's harmless today, but it's an outdated template setting. Effort: quick.
- **N2. The version number is typed into the code.** `components/GuidePages.tsx:11` has `APP_VERSION = '1.0'`, separate from Xcode's `MARKETING_VERSION` (`project.pbxproj:312`). They'll drift apart. Read it with `@capacitor/app`'s `App.getInfo()` instead. Effort: quick.
- **N3. Debug logging is left in.** `index.tsx:16, 53, 62` call `console.log('MentaList: …')`, and there are various `console.error` calls. Users don't see them, but tidy them up. Effort: quick.
- **N4. Office document preview goes through Microsoft.** `components/TaskViewer.tsx:68` sends web-link attachment URLs to `view.officeapps.live.com`. The app no longer creates web-link attachments (only files from the picker), so this is probably dead code. Remove it, or mention Microsoft in the privacy policy if it can still run. Effort: quick.
- **N5. Native project and app config aren't in git.** `ios/`, `capacitor.config.ts`, `firestore.rules` and many components are untracked (git status). Commit them so you don't lose the Xcode settings you're about to change. Effort: quick.
- **N6. Localization.** All text is written directly in English in the code. That's fine for an English-only launch; it only matters if you plan other languages.

---

## 3. Needs a manual check

These are things I couldn't confirm from the code:

1. **Attachment picker on a real iPhone:** test Photo Library, Take Photo or Video, and Choose Files after adding the camera and microphone strings (B3). Also run the build through App Store Connect validation and watch for "Missing purpose string" emails (ITMS-90683). If one names the photo library, add `NSPhotoLibraryUsageDescription`.
2. **Xcode privacy report:** after adding the manifest (B2), generate the privacy report from the archive and make sure there are no undeclared API categories. The filesystem plugin depends on Ionic's `ion-ios-filesystem` package, which isn't in `node_modules`; check whether it ships its own manifest.
3. **iPad layouts** in all orientations and in Split View (H6).
4. **Colour contrast** in every theme, especially the muted grey text (`text-slate-400` / `text-slate-500` on white or pale theme backgrounds, used widely for subtitles). Apple's minimum is 4.5:1 for text up to 17 pt. Use Xcode's Accessibility Inspector.
5. **Small screens:** iPhone SE (4.7-inch) with the keyboard open in Task Details and in the account sheet; make sure nothing is hidden behind the keyboard.
6. **Firebase security rules (if collaboration ships):**
   - `firestore.rules:24` lets any signed-in user look up any email and see the name behind it (email enumeration).
   - Lines 46-47 let any member rewrite `ownerUid` or `memberUids` (for example, remove the owner).
   - Line 56 lets any member delete the task for everyone.

   These aren't review blockers, but they're privacy and security risks. Also check that Firebase Auth's email templates and sender name look professional.
7. **Reminder delivery** with the app closed, after a restart, and with custom sounds (the sounds are in `public/` and the plugin resolves them, which looks right).
8. **Age rating answers:** if collaboration ships, invites from strangers count as "user-generated content", which affects the new age rating questionnaire.

---

## 4. App Store Connect checklist

- [ ] **Apple Developer Program** membership is active; bundle ID `com.anukritidua.mentalist` is registered; the signing team is set in Xcode (B1).
- [ ] **Build with Xcode 26 or later and the iOS 26 SDK.** This is required for uploads since 28 April 2026 ([Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/)). Your deployment target of iOS 15 is fine (the minimum is iOS 13 since 9 September 2026).
- [ ] **EU trader status** declared (required to distribute in the EU).
- [ ] **Privacy Policy URL** (B4), the same page that's linked inside the app.
- [ ] **Support URL** with a working contact email (H3). Marketing URL is optional.
- [ ] **App Privacy (nutrition labels).** Draft:
  - **If collaboration is OFF:** **"Data Not Collected."** Reminders, attachments and tasks stay on the device, and data processed only on the device doesn't count as "collected".
  - **If collaboration is ON:** "Data Linked to You", all with purpose **App Functionality** and **not used for tracking**:
    - Contact Info > **Name** (display name shown to collaborators)
    - Contact Info > **Email Address** (account and invites)
    - Identifiers > **User ID** (Firebase UID)
    - User Content > **Other User Content** (titles, notes, dates and subtasks of shared tasks)

    Photos and files aren't uploaded (attachments stay on the device, `cloudService.ts:169`), so don't declare Photos or Videos. Tracking: **No**. Answer "Yes, we collect data" and keep it consistent with `PrivacyInfo.xcprivacy`.
- [ ] **Age rating questionnaire.** Answer the new questions. With collaboration off, the expected result is the lowest rating. With it on, answer "Yes" to user-generated content and messaging between users.
- [ ] **Screenshots:**
  - iPhone 6.9-inch (and 6.5-inch if asked).
  - **iPad 13-inch, if iPad stays enabled** (H6).
  - They must show the real app, and must not show collaboration if it isn't in the build.
- [ ] **Description, subtitle and keywords** match what ships. Don't mention collaboration or AI if they're off. Avoid "beta", "test" or "coming soon".
- [ ] **App Review Notes:** say the app works without an account; explain how to trigger a reminder (Settings > Reminders > "Send test notification"); list the native features (H7). If collaboration is on, add the **two demo accounts** and steps (H4).
- [ ] **Export compliance:** the app only uses standard HTTPS (Firebase), so add `ITSAppUsesNonExemptEncryption` = `NO` to `Info.plist`. It's currently missing, so App Store Connect will ask on every upload.
- [ ] **Sign in with Apple:** not needed. The app only uses its own email and password accounts, with no Google or Facebook login, so [4.8](https://developer.apple.com/app-store/review/guidelines/#login-services) doesn't apply. If you ever add Google sign-in, you must also offer Sign in with Apple or an equivalent.
- [ ] **Pricing and availability** (Free), category (Productivity), and content rights.
- [ ] **Copyright** line (for example "2026 Anukriti Dua").

---

## 5. What's already fine (don't change these)

- **Notification permission is asked at the right moment.** It's only asked when you tap "Allow" next to a reminder or in Settings (`App.tsx:340-343`, `TaskDetails.tsx:255-270`). It isn't asked at launch, and there's a clear message when it's off. This matches 5.1.2 and the HIG.
- **Reminders use native local notifications** that arrive when the app is closed, with custom sounds and tap-to-open-task (`services/reminderService.ts`).
- **Data stays on the device.** There are no analytics, ads, tracking SDKs or IDFA, so no App Tracking Transparency prompt is needed. Capacitor's own manifest declares no tracking.
- **Works offline.** Fonts are bundled (`index.tsx:6-14`), there are no network calls unless collaboration is on, and there are no hard-coded IP addresses.
- **No secrets in the shipped app.** The old `GEMINI_API_KEY` is only in `.env.local`, which git ignores and which isn't referenced in code. It doesn't appear in `dist/` or `ios/App/App/public/`. Firebase web keys are meant to be public, but only once the security rules are tight (see manual check 6).
- **No downloaded code** (2.5.2). All web code is bundled into the app.
- **Dark mode** follows the system setting, with matching status bar style and background colour (`App.tsx:237-300`).
- **Safe areas at the top and bottom** are respected (`index.html:87-98`, `viewport-fit=cover`, panels use `env(safe-area-inset-bottom)`). The 16 px input font stops iOS from zooming when you tap a field.
- **Haptics** are light and used sparingly (task complete, reminders).
- **Share sheet** is used for sharing tasks and attachments, which is native and correct.
- **Unsaved-changes and delete confirmations** exist; deleted tasks go to History first.
- **App icon:** a single 1024×1024 universal icon with **no transparency** and no UI screenshots, which is correct for current Xcode.
- **Launch screen** exists and isn't used for ads.
- **Login services (4.8):** no third-party login, so no Sign in with Apple requirement.
- **No in-app purchases or external payment links.**
- **The Guide and About pages are a good touch**, and give the reviewer evidence of "lasting value" for 4.2.

---

## 6. Sources (fetched 14 October 2026)

- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/ (sections 1.2, 1.5, 2.1, 2.3, 2.3.1, 2.4.1, 2.5.2, 4.2, 4.8, 5.1.1, 5.1.2)
- Upcoming requirements (Xcode 26 / iOS 26 SDK since 28 April 2026; iOS 13 minimum target since 9 September 2026; privacy manifest reasons since 1 May 2024; age rating questions; EU trader status): https://developer.apple.com/news/upcoming-requirements/
- Offering account deletion in your app: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Describing use of required reason API: https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- Privacy manifest files: https://developer.apple.com/documentation/bundleresources/privacy-manifest-files (the page didn't render through the fetch tool; requirements were confirmed from the required-reason page above)
- HIG Accessibility (44×44 pt default control size, 4.5:1 contrast, Reduce Motion, text enlargement): https://developer.apple.com/design/human-interface-guidelines/accessibility
- HIG Alerts ("OK" only in informational alerts; always use "Cancel"): https://developer.apple.com/design/human-interface-guidelines/alerts
- HIG Layout, Launching, Typography (referenced for R5, R7 and R9; standard guidance, not re-fetched in full): https://developer.apple.com/design/human-interface-guidelines/

No guideline rules in the original brief conflicted with Apple's current pages. One update: the minimum build requirement is now **Xcode 26 and the iOS 26 SDK**.
