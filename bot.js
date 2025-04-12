const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const POCKETBASE_URL = process.env.POCKETBASE_URL;
const WEBAPP_URL = process.env.WEBAPP_URL;
const PORT = process.env.PORT || 3002;

// Validate required environment variables
if (!BOT_TOKEN || !POCKETBASE_URL || !WEBAPP_URL) {
    console.error('Error: Required environment variables are missing');
    console.error('Make sure BOT_TOKEN, POCKETBASE_URL, and WEBAPP_URL are set');
    process.exit(1);
}

// Validate WEBAPP_URL and POCKETBASE_URL
if (!WEBAPP_URL.startsWith('https://')) {
    console.error('Error: WEBAPP_URL must start with https://');
    console.error('Current WEBAPP_URL:', WEBAPP_URL);
    process.exit(1);
}

if (!POCKETBASE_URL.startsWith('https://')) {
    console.error('Error: POCKETBASE_URL must start with https://');
    console.error('Current POCKETBASE_URL:', POCKETBASE_URL);
    process.exit(1);
}

console.log('Starting bot with configuration:');
console.log('POCKETBASE_URL:', POCKETBASE_URL);
console.log('WEBAPP_URL:', WEBAPP_URL);

// Initialize bot and PocketBase
const bot = new Telegraf(BOT_TOKEN);
const pb = new PocketBase(POCKETBASE_URL);

// Function to test PocketBase connection
async function waitForPocketBase(retries = 5, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempting to connect to PocketBase (attempt ${i + 1}/${retries})...`);
            await pb.health.check();
            console.log('PocketBase connection successful!');
            return true;
        } catch (error) {
            console.error(`Connection attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error('Failed to connect to PocketBase');
}

// Start everything
async function startApp() {
    try {
        // Test PocketBase connection first
        await waitForPocketBase();
        
        // Start the bot
        await bot.launch();
        console.log('Bot started successfully');
        
        // Start the express server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Web App URL: ${WEBAPP_URL}`);
        });
    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Initialize express app
const app = express();

// Add JSON parsing middleware
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Explicitly handle the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Add basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Add menu management endpoints
app.get('/api/menu', async (req, res) => {
    try {
        const records = await pb.collection('meals').getFullList({
            filter: 'active = true',
            sort: 'created',
        });
        res.json(records);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

// Add order submission endpoint
app.post('/api/submit-order', async (req, res) => {
    try {
        console.log('\n=== Received new order submission ===');
        console.log('Order data:', req.body);

        // Create a new order record in PocketBase
        const orderData = {
            meals: req.body,
            created: new Date().toISOString()
        };

        const record = await pb.collection('orders').create(orderData);
        console.log('Successfully saved order to PocketBase. Record ID:', record.id);
        
        res.json({ success: true, orderId: record.id });
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ error: 'Failed to save order' });
    }
});

// Start command
bot.command('start', async (ctx) => {
    try {
        console.log('Received /start command from user:', ctx.from.id);
        await ctx.reply('Welcome to the Meal Planner! Click the button below to start planning your meals.', {
            reply_markup: {
                inline_keyboard: [[
                    { 
                        text: 'Open Meal Planner', 
                        web_app: { 
                            url: WEBAPP_URL
                        } 
                    }
                ]]
            }
        });
        console.log('Sent welcome message with web app button');
    } catch (error) {
        console.error('Error in start command:', error);
        await ctx.reply('Sorry, there was an error. Please try again later.');
    }
});

// Menu management commands
bot.command('menu', async (ctx) => {
    try {
        const records = await pb.collection('meals').getFullList({
            filter: 'active = true',
            sort: 'created',
        });
        
        let message = '🍽️ Current Menu:\n\n';
        records.forEach((meal, index) => {
            message += `${index + 1}. ${meal.name}\n`;
            message += `   ${meal.description}\n`;
            message += `   Category: ${meal.category}\n\n`;
        });
        
        await ctx.reply(message);
    } catch (error) {
        console.error('Error fetching menu:', error);
        await ctx.reply('Sorry, there was an error fetching the menu. Please try again later.');
    }
});

// Handle web app data
bot.on('web_app_data', async (ctx) => {
    try {
        console.log('\n=== Received new order ===');
        console.log('User ID:', ctx.from.id);
        console.log('Username:', ctx.from.username);
        console.log('Raw web app data:', ctx.webAppData.data);

        // Parse the data
        const data = JSON.parse(ctx.webAppData.data);
        console.log('Parsed order data:', JSON.stringify(data, null, 2));
        
        // Create a new order record in PocketBase
        const orderData = {
            user_id: ctx.from.id,
            username: ctx.from.username,
            meals: data,
            created: new Date().toISOString()
        };
        console.log('Prepared order data for PocketBase:', JSON.stringify(orderData, null, 2));

        try {
            const record = await pb.collection('orders').create(orderData);
            console.log('Successfully saved order to PocketBase. Record ID:', record.id);
        } catch (pbError) {
            console.error('PocketBase error:', pbError);
            throw pbError;
        }

        // Format the message
        let message = '📋 Your Meal Plan:\n\n';
        for (const [day, meal] of Object.entries(data)) {
            message += `*${day}:* ${meal}\n`;
        }
        console.log('Formatted message:', message);

        // Send the formatted message
        await ctx.reply(message, { parse_mode: 'Markdown' });
        console.log('Successfully sent message to user');
        console.log('=== Order processing completed ===\n');
    } catch (error) {
        console.error('\n=== Error processing order ===');
        console.error('Error details:', error);
        console.error('Stack trace:', error.stack);
        console.error('=== Error processing completed ===\n');
        
        await ctx.reply('Sorry, there was an error processing your meal plan. Please try again.');
    }
});

// Start the application
startApp();

// Enable graceful stop
process.once('SIGINT', () => {
    console.log('SIGINT received, stopping bot...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('SIGTERM received, stopping bot...');
    bot.stop('SIGTERM');
}); 