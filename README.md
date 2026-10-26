# Digital Menu

A restaurant menu website with an admin area protected by email and password.

- **Customers** open the site and see the menu: categories, dish photos, veg and non-veg marks, search, a veg-only filter, and sold-out labels.
- **Admins** open `/admin`, sign in with email and password, and manage dishes, prices, photos, categories, opening hours and availability. Changes appear on the menu straight away, with no publish step.
- **Forgot password** sends a reset email.

Built with React, Vite, Tailwind CSS, Firebase Authentication and Cloud Firestore. It runs on Firebase's free Spark plan.

## How the security works

Customers can only read the menu. Writing is blocked by the database rules in `firestore.rules`, not by the app, so hiding a button is never the only protection.

A person can change the menu only if both of these are true:

1. They are signed in with an email and password you created in the Firebase console.
2. Their user ID has a document in the `admins` collection, which only you can create in the console.

Anyone else who signs in, or who calls the database directly, gets "permission denied".

## Setup (about 15 minutes)

### 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and create a project.
2. In the project, choose **Build > Authentication > Get started**, then enable **Email/Password**.
3. In **Authentication > Settings > User actions**, turn off **Enable create (sign-up)**. Admins are added by you in the console, so nobody can register themselves.
4. Choose **Build > Firestore Database > Create database**. Pick a location near your customers and start in production mode.
5. Open the **Rules** tab, paste the full contents of `firestore.rules`, and **Publish**.

### 2. Connect the app

1. In **Project settings > General > Your apps**, add a **Web app** (the `</>` icon).
2. Copy `.env.example` to `.env` and fill in `apiKey`, `authDomain`, `projectId` and `appId` from the config Firebase shows you.

```bash
npm install
npm run dev
```

Open the address it prints. You will see the menu (empty at first).

### 3. Create the first admin

1. In **Authentication > Users > Add user**, enter the admin's email and a password.
2. Copy that user's **User UID**.
3. In **Firestore Database > Start collection**, create a collection named `admins`. Add a document whose **Document ID is the User UID**. Give it one field, `email` (string), set to the admin's email.
4. Go to `/admin` on your site and sign in.

To add another admin later, repeat these steps. To remove one, delete their document in `admins`.

If someone signs in but has no `admins` document, the page shows them their User UID. They can send it to you and you create the document for them.

### 4. Add your menu

On the Dishes tab, choose **Add sample menu** to start from example dishes, or add your own categories and dishes. Open a dish to edit it, add a photo, set its labels and move it up or down. The switch beside each dish marks it available or sold out instantly.

## Going live

Firebase Hosting (free):

```bash
npm install -g firebase-tools
firebase login
firebase use --add      # choose your project
npm run build
firebase deploy
```

Your site will be at `https://<project-id>.web.app`. To use your own domain, add it under **Hosting > Add custom domain**.

If you host somewhere else (Vercel, Netlify), add the four `VITE_FIREBASE_*` values as environment variables, set the build command to `npm run build` and the output folder to `dist`, redirect all paths to `/index.html`, and add your site's domain under **Authentication > Settings > Authorized domains**.

## Good to know

- **Photos** are shrunk in the browser and stored inside each dish's database record, so Firebase Storage (which needs a paid plan) is not required. Keep to one photo per dish.
- **Password reset emails** use Firebase's default template. You can change the wording under **Authentication > Templates**.
- **A QR code** that points to your site address lets customers open the menu from the table.
- The menu data is public by design. The Firebase config values in `.env` identify the project and are not secrets. What protects your data is `firestore.rules`.

## Project layout

```
firestore.rules        Who can read and write what
src/pages/Menu.jsx     Customer menu
src/pages/Admin.jsx    Sign-in check and admin approval
src/pages/Login.jsx    Email and password form, forgot password
src/pages/Dashboard.jsx  Dishes, categories and restaurant settings
src/data.js            Live data hook and sample menu
src/image.js           In-browser photo shrinking
```
