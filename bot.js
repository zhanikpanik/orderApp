const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const POCKETBASE_URL = process.env.POCKETBASE_URL;
const WEBAPP_URL = process.env.WEBAPP_URL;
const PORT = process.env.PORT || 8080;

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

// Allow HTTP for local development
if (!POCKETBASE_URL.startsWith('http://') && !POCKETBASE_URL.startsWith('https://')) {
    console.error('Error: POCKETBASE_URL must start with http:// or https://');
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
            console.log('Using PocketBase URL:', POCKETBASE_URL);
            
            const healthCheck = await pb.health.check();
            console.log('Health check response:', healthCheck);
            console.log('PocketBase connection successful!');
            return true;
        } catch (error) {
            console.error(`Connection attempt ${i + 1} failed:`, error);
            console.error('Full error details:', {
                message: error.message,
                status: error.status,
                data: error.data,
                url: error.url
            });
            
            if (i < retries - 1) {
                console.log(`Waiting ${delay}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`Failed to connect to PocketBase at ${POCKETBASE_URL}`);
}

// Start everything
async function startApp() {
    let server = null;
    let botStarted = false;

    try {
        console.log('Starting application...');
        console.log('Environment variables:');
        console.log('PORT:', process.env.PORT);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('WEBAPP_URL:', process.env.WEBAPP_URL);
        console.log('POCKETBASE_URL:', process.env.POCKETBASE_URL);
        console.log('Current working directory:', process.cwd());
        console.log('Files in directory:', require('fs').readdirSync(process.cwd()));

        // Test PocketBase connection first
        await waitForPocketBase();
        
        // Start the bot with webhook mode
        await bot.launch({
            webhook: {
                domain: process.env.WEBAPP_URL,
                port: process.env.PORT
            }
        });
        botStarted = true;
        console.log('Bot started successfully in webhook mode');

        // Handle shutdown signals
        const shutdown = async (signal) => {
            console.log(`${signal} received. Shutting down gracefully...`);
            if (botStarted) {
                console.log('Stopping bot...');
                await bot.stop(signal);
            }
            if (server) {
                console.log('Closing server...');
                server.close(() => {
                    console.log('Server closed');
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        };

        process.once('SIGINT', () => shutdown('SIGINT'));
        process.once('SIGTERM', () => shutdown('SIGTERM'));

        return new Promise((resolve, reject) => {
            // Start the express server
            server = app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
                const addr = server.address();
                console.log('\n=== Web Server Configuration ===');
                console.log('Server address:', addr);
                console.log(`Server is running on port ${addr.port}`);
                console.log(`Web App URL: ${process.env.WEBAPP_URL}`);
                console.log(`Express server listening on ${addr.address}:${addr.port}`);
                console.log('===============================\n');
                resolve(server);
            }).on('error', (err) => {
                console.error('Failed to start server:', err);
                reject(err);
            });

            // Add error handling for the server
            server.on('error', (error) => {
                console.error('Server error:', error);
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${process.env.PORT} is already in use`);
                    process.exit(1);
                }
            });
        });
    } catch (error) {
        console.error('Failed to start application:', error);
        console.error('Stack trace:', error.stack);
        if (botStarted) {
            await bot.stop();
        }
        process.exit(1);
    }
}

// Initialize express app
const app = express();

// Basic security middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Add JSON parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS support
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Add request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    
    // Log response
    const oldSend = res.send;
    res.send = function(data) {
        console.log(`[${timestamp}] Response:`, data);
        return oldSend.apply(res, arguments);
    };
    
    next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Add health check endpoint with detailed info
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: process.env.PORT,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT
        },
        headers: req.headers,
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            pid: process.pid
        }
    });
});

// Serve static files with proper content type
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

// Explicitly handle the root path
app.get('/', (req, res) => {
    console.log('Serving index.html from:', path.join(__dirname, 'index.html'));
    res.sendFile(path.join(__dirname, 'index.html'));
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
startApp().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
}); 