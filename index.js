// TEXTROFYSUPPORTBOT- Node.js (Telegraf + Google Gemini API)
const { Telegraf } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

// 1. अपने टोकन्स यहाँ डालें (या Render/Cloudflare के Environment Variables में सेट करें)
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const bot = new Telegraf(BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// इन-मेमोरी या हल्का डेटा स्टोर (प्रोडक्शन में इसे Supabase या JSON से जोड़ा जाएगा)
const userSessions = {}; 

// जब यूजर पहली बार /start दबाए या किसी ऐप के लिंक से आए
bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const payload = ctx.payload; // यहाँ ऐप का नाम आएगा जैसे app_calculator_user123

  let appName = "Textrofy General Ecosystem";
  if (payload) {
    appName = payload.split('_')[1] || "Custom PWA App";
  }

  // यूजर का सेशन सेव करें
  userSessions[telegramId] = {
    currentApp: appName,
    aiMode: true, // डिफ़ॉल्ट रूप से एआई मोड ऑन रहेगा
    history: []
  };

  await ctx.reply(`👋 Welcome to Textrofy Support!\n\nYour account has been successfully linked with **${appName.toUpperCase()}**.\n\n🤖 AI Assistant is active. Ask me anything about your app, calculations, backups, or support!`, { parse_mode: 'Markdown' });
});

// जब यूजर किसी दूसरे ऐप से दोबारा बटन दबाकर आए (बिना /start के ऑटो-लिंक)
bot.action(/link_(.+)/, async (ctx) => {
  const telegramId = ctx.from.id;
  const appName = ctx.match[1];

  if (!userSessions[telegramId]) {
    userSessions[telegramId] = { currentApp: appName, aiMode: true, history: [] };
  } else {
    userSessions[telegramId].currentApp = appName;
  }

  await ctx.reply(`🔄 Switched context! You are now connected with **${appName.toUpperCase()}** app data. How can I help you?`, { parse_mode: 'Markdown' });
});

// यूजर के सभी टेक्स्ट मैसेजेज को संभालना (AI vs Manual Logic)
bot.on('text', async (ctx) => {
  const telegramId = ctx.from.id;
  const userText = ctx.message.text;

  // अगर यूजर का सेशन नहीं बना है तो ऑटो-क्रिएट करें
  if (!userSessions[telegramId]) {
    userSessions[telegramId] = { currentApp: "Textrofy Hub", aiMode: true, history: [] };
  }

  const session = userSessions[telegramId];

  // अगर मैनुअल मोड ऑन है, तो यह एडमिन (आपके) पास फॉरवर्ड होगा
  if (!session.aiMode) {
    // यहाँ आपका एडमिन फॉरवर्डिंग लॉजिक या डैशबोर्ड वेबहुक जुड़ेगा
    await ctx.reply("📨 Your message has been sent to the human support team. We will reply shortly!");
    return;
  }

  try {
    // Google Gemini Flash Model (फ्री टियर) का इस्तेमाल करके जवाब देना
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash', // या 3.8-flash
      contents: `You are an expert AI support assistant for ${session.currentApp}. Help the user politely, accurately, and concisely in Hindi or English depending on their query. User Query: ${userText}`
    });

    const aiReply = response.text;
    await ctx.reply(aiReply);

  } catch (error) {
    console.error("AI Error:", error);
    await ctx.reply("⚠️ Maaf kijiye, abhi AI system busy hai. Kripya thodi der baad koshish karein.");
  }
});

bot.launch();
console.log("🤖 Textrofy Master Bot is running live & free!");
