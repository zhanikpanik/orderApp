# Telegram Meal Planner Web App

A Telegram Web App that allows users to plan their meals for the week and send the plan to a Telegram bot. All orders are stored in PocketBase.

## Features

- Modern, responsive UI that adapts to Telegram's theme
- Easy meal selection for each day of the week
- Modal interface for meal input
- Automatic data sending to Telegram bot
- Formatted meal plan display in chat
- Data storage in PocketBase

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a new bot with [@BotFather](https://t.me/botfather) and get your bot token

3. Set up PocketBase:
   - Download and install PocketBase from [pocketbase.io](https://pocketbase.io)
   - Start PocketBase server
   - Create a new collection called 'orders' with the following fields:
     - user_id (number)
     - username (text)
     - meals (json)
     - created (date)

4. Update the configuration in `bot.js`:
   - Set your `BOT_TOKEN`
   - Set your `POCKETBASE_URL` (default: http://127.0.0.1:8090)

5. Deploy the web app to a hosting service (e.g., Heroku, DigitalOcean, etc.)

6. Update the web app URL in `bot.js` to match your deployed URL

7. Start the bot:
```bash
npm start
```

## Local Development

1. Install ngrok for local development:
```bash
npm install -g ngrok
```

2. Start PocketBase server:
```bash
./pocketbase serve
```

3. In a new terminal, start the bot:
```bash
npm start
```

4. In another terminal, start ngrok to create a public URL:
```bash
npm run dev
```

5. Copy the HTTPS URL provided by ngrok and set it as the WEBAPP_URL environment variable:
```bash
# Windows (PowerShell)
$env:WEBAPP_URL="https://your-ngrok-url"

# Windows (CMD)
set WEBAPP_URL=https://your-ngrok-url

# Linux/MacOS
export WEBAPP_URL=https://your-ngrok-url
```

6. Restart the bot to apply the new URL:
```bash
npm start
```

7. Test the bot:
   - Open Telegram and find your bot
   - Send the `/start` command
   - Click the "Open Meal Planner" button
   - The web app should open in Telegram

## Usage

1. Start the bot with `/start` command
2. Click the "Open Meal Planner" button
3. Select meals for each day of the week
4. Click "Submit Order" to send the plan to the bot
5. The bot will display your meal plan in a formatted message
6. The order will be stored in PocketBase

## Development

The project consists of:
- `index.html`: The web app interface
- `bot.js`: The Telegram bot implementation with PocketBase integration
- `package.json`: Project dependencies

## Notes

- The web app uses Telegram's Web App API for seamless integration
- The UI adapts to Telegram's theme using CSS variables
- All orders are stored in PocketBase for future reference
- The bot includes user identification for tracking orders
- For local development, use ngrok to create a public URL for the web app 