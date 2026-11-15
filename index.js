// TEXTROFYSUPPORTBOT - Node.js (Telegraf + Google Generative AI)
const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Environment Variables से टोकन्स लेना (Render सुरक्षा के लिए)
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!BOT_TOKEN || !GEMINI_API_KEY) {
  console.error("⚠️ Error: BOT_TOKEN or GEMINI_API_KEY is missing in environment variables!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// इन-मेमोरी डेटा स्टोर (सेशन मैनेजमेंट)
const userSessions = {}; 

// जब यूजर पहली बार /start दबाए या किसी ऐप के लिंक से आए
bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const payload = ctx.payload; // यहाँ ऐप का नाम आएगा जैसे app_calculator_user123

  let appName = "Textrofy General Ecosystem";
  if (payload) {
    const parts = payload.split('_');
    appName = parts[1] ? parts[1].toUpperCase() : "Custom PWA App";
  }

  // यूजर का सेशन सेव करें
  userSessions[telegramId] = {
    currentApp: appName,
    aiMode: true, // डिफ़ॉल्ट रूप से एआई मोड ऑन रहेगा
    history: []
  };

  await ctx.reply(`👋 Welcome to Textrofy Support!\n\nYour account has been successfully linked with **${appName}**.\n\n🤖 AI Assistant is active. Ask me anything about your app, calculations, backups, or support!`, { parse_mode: 'Markdown' });
});

// जब यूजर किसी दूसरे ऐप से दोबारा बटन दबाकर आए (ऑटो-लिंक)
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

// यूजर के सभी टेक्स्ट मैसेजेज को संभालना (AI vs Manual Logic)
bot.on('text', async (ctx) => {
  const telegramId = ctx.from.id;
  const userText = ctx.message.text;

  // अगर यूजर का सेशन नहीं बना है तो डिफ़ॉल्ट सेट करें
  if (!userSessions[telegramId]) {
    userSessions[telegramId] = { currentApp: "TEXTROFY HUB", aiMode: true, history: [] };
  }

  const session = userSessions[telegramId];

  // अगर मैनुअल मोड ऑन है, तो एडमिन के लिए मैसेज भेजें
  if (!session.aiMode) {
    await ctx.reply("📨 Your message has been sent to the human support team. We will reply shortly!");
    return;
  }

  try {
    // Google Gemini Flash Model का इस्तेमाल करके जवाब देना
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `You are an expert, polite, and helpful AI support assistant for the app/ecosystem named "${session.currentApp}". 
    Help the user accurately and concisely. Reply in the language the user is speaking (Hindi, Hinglish, or English). 
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

// बोट लॉन्च करना
bot.launch().then(() => {
  console.log("🤖 Textrofy Master Bot is running live & free!");
});

// बोट बंद होने पर सुरक्षित एग्जिट
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
