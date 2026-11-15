// TEXTROFYSUPPORTBOT - Master Node.js (Telegraf + Google Generative AI + Express Server)
const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !GEMINI_API_KEY) {
  console.error("❌ ERROR: BOT_TOKEN or GEMINI_API_KEY is missing!");
  process.exit(1);
}

// एक्सप्रेस सर्वर ताकि Render इसे हमेशा ऑनलाइन रखे
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('🤖 Textrofy Support Bot is running live & free 24x7!');
});

app.listen(PORT, () => {
  console.log(`🌐 Server is listening on port ${PORT}`);
});

const bot = new Telegraf(BOT_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const userSessions = {}; 

// /start कमांड
bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const payload = ctx.payload; 

  let appName = "TEXTROFY HUB";
  if (payload) {
    const parts = payload.split('_');
    appName = parts[1] ? parts[1].toUpperCase() : "CUSTOM PWA APP";
  }

  userSessions[telegramId] = {
    currentApp: appName,
    aiMode: true,
    history: []
  };

  await ctx.reply(`👋 Welcome to Textrofy Support!\n\nYour account is successfully linked with **${appName}**.\n\n🤖 AI Assistant is active. Ask me anything about your app, calculations, or support!`, { parse_mode: 'Markdown' });
});

// ऐप स्विचिंग एक्शन
bot.action(/link_(.+)/, async (ctx) => {
  const telegramId = ctx.from.id;
  const appName = ctx.match[1].toUpperCase();

  if (!userSessions[telegramId]) {
    userSessions[telegramId] = { currentApp: appName, aiMode: true, history: [] };
  } else {
    userSessions[telegramId].currentApp = appName;
  }

  await ctx.reply(`🔄 Switched context! You are now connected with **${appName}** app data. How can I help you?`, { parse_mode: 'Markdown' });
});

// टेक्स्ट मैसेज हैंडलर (AI & Manual Mode)
bot.on('text', async (ctx) => {
  const telegramId = ctx.from.id;
  const userText = ctx.message.text;

  if (!userSessions[telegramId]) {
    userSessions[telegramId] = { currentApp: "TEXTROFY HUB", aiMode: true, history: [] };
  }

  const session = userSessions[telegramId];

  if (!session.aiMode) {
    await ctx.reply("📨 Your message has been sent to the human support team. We will reply shortly!");
    return;
  }

  try {
    // आपके अकाउंट के हिसाब से सबसे सटीक और लेटेस्ट मॉडल
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    
    const prompt = `You are an expert and polite AI support assistant for the app "${session.currentApp}". 
    Help the user accurately and concisely. Reply in Hindi, Hinglish, or English matching the user's language. 
    User Query: ${userText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiReply = response.text();

    await ctx.reply(aiReply);

  } catch (error) {
    console.error("AI Error:", error);
    await ctx.reply("⚠️ Maaf kijiye, abhi AI system busy hai. Kripya thodi der baad koshish karein.");
  }
});

// बोट लॉन्च
bot.launch().then(() => {
  console.log("🤖 Telegram Bot launched successfully!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
