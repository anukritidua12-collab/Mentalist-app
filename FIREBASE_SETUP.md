# Setting up collaboration (Firebase)

MentaList uses Firebase, Google's free app backend, to deliver collaboration invites and keep shared tasks in sync between people. Setup takes about 10 minutes and the free plan is more than enough.

Collaboration is **switched off in version 1.0** (`FEATURES.collaboration = false` in `config.ts`). While it's off, Firebase never starts and the collaboration screens (Shared with Me, the notifications bell, Account & collaboration, Invite to collaborate) are hidden. All the code is kept, ready to switch back on.

## 0. Before switching it on for the App Store

Apple requires these before an app with accounts and shared content can be approved. They aren't built yet:

- **Delete account** inside the app (Guideline 5.1.1(v)), which also removes the user's shared tasks and invites (`firestore.rules` must allow it).
- **Leave a shared task**, and **report or block** someone who sends unwanted invites (Guideline 1.2). `leaveSharedTask` already exists in `services/cloudService.ts`.
- **Privacy:** update `public/privacy.html` (accounts, email, shared tasks stored with Google Firebase), add the collected data types to `ios/App/App/PrivacyInfo.xcprivacy`, and update the App Store privacy label (Name, Email Address, User ID, Other User Content; linked to the user; app functionality; no tracking).
- **Sign-up screen:** say that tasks you share are stored with Google Firebase.
- **App Review:** give Apple two demo accounts with verified emails.

Then set `collaboration: true` in `config.ts` and follow the steps below.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. Click **Create a project**, name it `MentaList`, and click through. Google Analytics is optional; you can turn it off.

## 2. Turn on email sign-in

1. In the left menu, open **Build → Authentication**, then click **Get started**.
2. On the **Sign-in method** tab, choose **Email/Password**, switch on the first toggle (Email/Password), and click **Save**.

## 3. Create the database

1. Open **Build → Firestore Database** and click **Create database**.
2. Pick a location close to your users (for India, `asia-south1 (Mumbai)`). The location can't be changed later.
3. Choose **Start in production mode** and click **Create**.
4. Open the **Rules** tab, delete everything in the editor, paste in the full contents of `firestore.rules` from this project, and click **Publish**.

The rules make sure:
- only the people on a task can see or edit it
- only the invited person (with a verified email) can accept an invite

## 4. Connect the app

1. Click the gear icon next to **Project Overview**, then **Project settings**.
2. Under **Your apps**, click the web icon `</>`, name it `MentaList`, and click **Register app**. You don't need Firebase Hosting.
3. Firebase shows a `firebaseConfig` block. Copy each value into `.env.local` in the project folder, following the names in `.env.example`:

   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=mentalist-xxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=mentalist-xxxx
   VITE_FIREBASE_STORAGE_BUCKET=mentalist-xxxx.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```

   These values identify your project but aren't passwords. The security rules from step 3 are what protect the data.

## 5. Rebuild the iPhone app

In Terminal, from the project folder:

```
npm run build && npx cap sync ios
```

Then press Run in Xcode.

## 6. (Optional) Turn it on for the web version too

The GitHub Pages site is built by GitHub, which can't see your `.env.local`. To enable collaboration there:
1. In the GitHub repo, open **Settings → Secrets and variables → Actions** and add each `VITE_FIREBASE_...` value as a repository secret.
2. In `.github/workflows/deploy.yml`, give the **Build** step an `env:` section that passes them in, for example `VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}`.

## How it works for your users

1. Open a task and tap **Invite to collaborate**. The first time, create an account (name, email, password) and tap the link in the verification email.
2. Enter the other person's email and tap **Send invite**.
   - **If they already use MentaList**, the invite appears in their Notifications (🔔) with **Accept / Decline**. You're notified when they reply.
   - **If they don't**, MentaList offers to send them a message (WhatsApp, Messages, email…) with the download link and instructions. Once they create an account with that email, the invite is waiting in their Notifications.
3. After they accept, the task appears under **Shared with Me** for them. Both of you can add, edit, complete and delete the task and its subtasks, and changes appear on each other's phones within seconds.

**Share details** is the simpler option: it sends a read-only copy of the task as a message. No account is needed.

### Limits to know about
- Attachments stay on the device that added them; they aren't shared.
- Without the paid Apple Developer Program, invites aren't push notifications: they appear when the other person opens MentaList. Push can be added once you join the program.
