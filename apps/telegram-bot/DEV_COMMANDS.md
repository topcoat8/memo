# Developer Commands

## 🛠 Local Development
Start the bot locally in long-polling mode. This will "steal" usage from the production webhook.
```bash
npm start
```
Or with auto-reload:
```bash
npm run dev
```

## 🔄 Restore Production Webhook
After you are done developing locally, you **must manualy restore** the webhook for the production Vercel deployment to work again.

**Production URL:** `https://memo-tg.vercel.app/`

Run this command:
```bashh
npm run hook https://memo-tg.vercel.app/api/webhook
```
*Response should be: "✅ Webhook set successfully!"*

