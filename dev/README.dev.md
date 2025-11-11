# Local development (one-liners)

From the repository root:

1. Install dependencies and create `.env.local` from example (postinstall will copy automatically):

```bash
npm install
```

2. Start the Firebase emulators (Auth + Firestore):

```bash
npm run emulators
```

3. Start the front-end dev server:

```bash
npm run dev
```