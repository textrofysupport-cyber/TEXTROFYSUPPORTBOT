// TEXTROFYSUPPORTBOT - Ultimate Master Node.js (Telegraf + Native Gemini Flash API + Express)
const { Telegraf } = require('telegraf');
const express = require('express');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error("❌ ERROR: BOT_TOKEN is missing!");
  process.exit(1);
}

// एक्सप्रेस सर्वर ताकि Render इसे हमेशा ऑनलाइन रखे
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('🤖 Textrofy Ultimate Support Bot is running live & free 24x7!');
});

app.listen(PORT, () => {
  console.log(`🌐 Server is listening on port ${PORT}`);
});

const bot = new Telegraf(BOT_TOKEN);

// इन-मेमोरी सेशन और प्री-सेट क्विक रिप्लाई कमांड्स
const userSessions = {}; 
const quickPresets = {
  "/help": "💡 *Textrofy Support Hub*\n\nHere are your quick options:\n• /start - Link your app\n• /ai - Switch to AI Assistant mode\n• /manual - Talk to Human Admin\n• /quick - Fast preset replies",
  "/calculators": "📊 *Calculators & Tools:* Access all financial, utility, and PWA calculation tools instantly from your Textrofy Hub dashboard.",
  "/backup": "🔄 *Data Backup Guide:* Your app data is safely stored locally in your browser/PWA local storage. Use the export/import button inside the app settings.",
  "/pricing": "💎 *Pricing Tier:* You are currently enjoying the Lifetime Free Ecosystem tier of Textrofy Hub!"
};

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
    mode: "ai", // 'ai', 'quick', या 'manual'
  };

  await ctx.reply(`👋 Welcome to Textrofy Support!\n\nYour account is successfully linked with **${appName}**.\n\nChoose your mode:\n🤖 /ai - Smart AI Assistant\n⚡ /quick - Fast Preset Menu\n👤 /manual - Human Admin`, { parse_mode: 'Markdown' });
});

// मोड बदलने के कमांड्स
bot.command('ai', async (ctx) => {
  if (userSessions[ctx.from.id]) userSessions[ctx.from.id].mode = 'ai';
  await ctx.reply("🤖 *AI Assistant Mode* activated! Ask me anything about your app.");
});

bot.command('quick', async (ctx) => {
  if (userSessions[ctx.from.id]) userSessions[ctx.from.id].mode = 'quick';
  await ctx.reply("⚡ *Quick Preset Mode* activated!\n\nType or choose a command:\n/calculators\n/backup\n/pricing\n/help");
});

bot.command('manual', async (ctx) => {
  if (userSessions[ctx.from.id]) userSessions[ctx.from.id].mode = 'manual';
  await ctx.reply("👤 *Human Admin Mode* activated! Your messages will now be sent directly to human support.");
});

// प्री-सेट कमांड हैंडलर
bot.hears(['/help', '/calculators', '/backup', '/pricing'], async (ctx) => {
  const text = ctx.message.text;
  if (quickPresets[text]) {
    await ctx.reply(quickPresets[text], { parse_mode: 'Markdown' });
  }
});

// टेक्स्ट मैसेज हैंडलर (Smart 3-Way Logic)
bot.on('text', async (ctx) => {
  const telegramId = ctx.from.id;
  const userText = ctx.message.text;

  // अगर यूजर कमांड टाइप कर रहा है तो इग्नोर करें
  if (userText.startsWith('/')) return;

  if (!userSessions[telegramId]) {
    userSessions[telegramId] = { currentApp: "TEXTROFY HUB", mode: "ai" };
  }

  const session = userSessions[telegramId];

  // 1. Manual Mode
  if (session.mode === 'manual') {
    await ctx.reply("📨 Your message has been forwarded to the human support team. We will reply shortly!");
    return;
  }

  // 2. Quick Mode (अगर AI की जरूरत न हो या तुरंत जवाब चाहिए)
  if (session.mode === 'quick') {
    await ctx.reply("⚡ *Quick Reply:* For instant assistance, please use /help or check our dashboard links!", { parse_mode: 'Markdown' });
    return;
  }

  // 3. AI Mode (Gemini 3.8 Flash Direct Fetch API)
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    // नेटिव फेच का उपयोग ताकि कोई पैकेज एरर न आए
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `You are an expert, polite AI support assistant for the app "${session.currentApp}". Answer concisely in Hindi, Hinglish, or English based on user query. User Query: ${userText}` }]
        }]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      const aiReply = data.candidates[0].content.parts[0].text;
      await ctx.reply(aiReply);
    } else {
      throw new Error("Invalid response from Gemini API");
    }

  } catch (error) {
    console.error("AI Fallback Error:", error);
    // ऑटोमैटिक फॉलबैक: अगर AI काम न करे तो तुरंत क्विक रिप्लाई मोड से जवाब दे देगा ताकि यूजर अटके नहीं!
    await ctx.reply("⚡ *Smart Fallback:* AI is taking a moment, but here is your instant help:\n\n" + quickPresets["/help"], { parse_mode: 'Markdown' });
  }
});

// बोट लॉन्च
bot.launch().then(() => {
  console.log("🤖 Textrofy Ultimate Master Bot launched successfully!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
