const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

// Configuration
const BOT_TOKEN = '7544019946:AAE2JRLJglCK6WVuYosONGCzhxYD1TDL_tE';
const POCKETBASE_URL = 'http://127.0.0.1:8090';
const WEBAPP_URL = process.env.WEBAPP_URL || 'http://localhost:3002';
const PORT = process.env.PORT || 3002;

// Validate WEBAPP_URL
if (!WEBAPP_URL.startsWith('https://')) {
    console.error('Warning: WEBAPP_URL must start with https:// for Telegram Web App');
    console.error('Please set WEBAPP_URL to your ngrok HTTPS URL');
    process.exit(1);
}

console.log('Starting bot with configuration:');
console.log('POCKETBASE_URL:', POCKETBASE_URL);
console.log('WEBAPP_URL:', WEBAPP_URL);

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Initialize PocketBase
const pb = new PocketBase(POCKETBASE_URL);

// Initialize express app
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname)));

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
                            url: WEBAPP_URL,
                            mode: 'fullscreen',
                            expand: true
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

// Start the bot
bot.launch();

// Create server with port reuse
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Web App URL: ${WEBAPP_URL}`);
    console.log('Make sure this URL starts with https://');
    console.log('Health check available at:', `${WEBAPP_URL}/health`);
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is in use, trying to close existing connection...`);
        // Try to close the server and restart
        server.close(() => {
            console.log('Server closed, restarting...');
            server.listen(PORT);
        });
    } else {
        console.error('Server error:', error);
    }
});

// Enable graceful stop
process.once('SIGINT', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        bot.stop('SIGINT');
    });
});

process.once('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        bot.stop('SIGTERM');
    });
}); 