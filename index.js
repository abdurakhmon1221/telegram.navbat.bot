const TelegramBot = require("node-telegram-bot-api");
require('dotenv').config();

// TO'G'RILANGAN: Token har doim qo'shtirnoq ichida bo'lishi shart!
const token = process.env.BOT_TOKEN || "8365247379:AAHe3d6nydd1flbY5Ng6x5t_JHblxE5IAiE";
const bot = new TelegramBot(token, { polling: true });

// ====== DATA STORAGE ======
const users = {}; 
const companies = {}; 

// ====== KEYBOARDS (Visual UI) ======
const clientMenu = {
    reply_markup: {
        keyboard: [
            [{ text: "🔍 Joy qidirish" }, { text: "📅 Mening navbatim" }],
            [{ text: "📍 Yaqin joylar" }, { text: "📜 Tarix" }],
            [{ text: "⭐ Reyting" }, { text: "⚙️ Sozlamalar" }]
        ],
        resize_keyboard: true
    }
};

const businessMenu = {
    reply_markup: {
        keyboard: [
            [{ text: "⏭ Keyingi mijoz" }, { text: "📊 Statistika" }],
            [{ text: "📋 Navbatlar ro'yxati" }, { text: "🛠 Xizmatlar" }],
            [{ text: "⏸ Tanaffus" }, { text: "📢 Mijozlarga xabar" }]
        ],
        resize_keyboard: true
    }
};

// ====== ASOSIY LOGIKA ======

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    // Foydalanuvchi holatini tozalash
    users[chatId] = { step: 'idle' };
    
    bot.sendMessage(chatId, `<b>Assalomu alaykum ${msg.from.first_name}!</b>\n\nPlatformaga xush kelibsiz. Iltimos, rolingizni tanlang:`, {
        parse_mode: "HTML",
        reply_markup: {
            keyboard: [[{ text: "🏢 Biznes (Kompaniya)" }, { text: "👥 Mijoz (Foydalanuvchi)" }]],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text === "/start") return;

    // 1. Rol tanlash
    if (text === "🏢 Biznes (Kompaniya)") {
        users[chatId] = { role: 'biz', step: 'name' };
        return bot.sendMessage(chatId, "Kompaniya (tashkilot) nomini kiriting:", { 
            reply_markup: { remove_keyboard: true } 
        });
    } 
    
    if (text === "👥 Mijoz (Foydalanuvchi)") {
        users[chatId] = { role: 'client', step: 'done' };
        return bot.sendMessage(chatId, "Siz mijoz sifatida ro'yxatdan o'tdingiz!", clientMenu);
    }

    // 2. Biznes profilini to'ldirish
    if (users[chatId] && users[chatId].role === 'biz' && users[chatId].step === 'name') {
        companies[chatId] = { name: text, owner: chatId, avgTime: 15, queue: [] };
        users[chatId].step = 'done';
        return bot.sendMessage(chatId, `✅ <b>${text}</b> profili yaratildi!\n\nEndi siz mijozlarni qabul qilishingiz mumkin.`, {
            parse_mode: "HTML",
            reply_markup: businessMenu
        });
    }

    // 3. Mijoz qidiruv mantiqi
    if (text === "🔍 Joy qidirish") {
        const companyList = Object.values(companies);
        if (companyList.length === 0) {
            return bot.sendMessage(chatId, "Hozircha hech qanday kompaniya ro'yxatdan o'tmagan.");
        }

        const inline_keyboard = companyList.map(c => ([{
            text: `📍 ${c.name} (Navbat: ${c.queue.length})`,
            callback_data: `join_${c.owner}`
        }]));

        bot.sendMessage(chatId, "Navbatga turish uchun joyni tanlang:", {
            reply_markup: { inline_keyboard }
        });
    }

    // 4. Biznes: Navbatni siljitish
    if (text === "⏭ Keyingi mijoz") {
        const company = companies[chatId];
        if (company && company.queue.length > 0) {
            const nextUser = company.queue.shift();
            bot.sendMessage(chatId, `✅ Mijoz chaqirildi. Navbatda ${company.queue.length} kishi qoldi.`);
            bot.sendMessage(nextUser, "🔔 <b>Sizning navbatingiz keldi!</b>\nIltimos, xizmat ko'rsatish joyiga kiring.", { parse_mode: "HTML" });
        } else {
            bot.sendMessage(chatId, "Navbat bo'sh.");
        }
    }
});

// 5. Callback Query (Inline tugmalar uchun)
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("join_")) {
        const ownerId = data.split("_")[1];
        const company = companies[ownerId];

        if (!company) return bot.answerCallbackQuery(query.id, { text: "Xatolik: Kompaniya topilmadi" });

        if (!company.queue.includes(chatId)) {
            company.queue.push(chatId);
            const pos = company.queue.length;
            bot.sendMessage(chatId, `✅ <b>Navbat olingan!</b>\n\n🏢 Joy: ${company.name}\n🔢 O'rningiz: ${pos}\n⏳ Vaqt: ~${pos * company.avgTime} min.`, { parse_mode: "HTML" });
        } else {
            bot.answerCallbackQuery(query.id, { text: "Siz allaqachon navbatdasiz!", show_alert: true });
        }
    }
});
