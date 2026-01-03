const TelegramBot = require("node-telegram-bot-api");
require('dotenv').config();

// Tokenni .env faylidan olish yoki o'rniga qo'yish
const token = process.env.BOT_TOKEN || "SIZNING_BOT_TOKENINGIZ";
const bot = new TelegramBot(token, { polling: true });

// ====== DATA STORAGE (Baza o'rniga hozircha xotira) ======
const users = {}; 
const companies = {}; 
const queues = {}; 

// ====== KEYBOARDS (Siz yuborgan rasmdagi uslubda) ======

// Mijoz menyusi
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

// Biznes menyusi
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
    
    if (!users[chatId]) {
        bot.sendMessage(chatId, `<b>Assalomu alaykum ${msg.from.first_name}!</b>\n\nPlatformaga xush kelibsiz. Iltimos, rolingizni tanlang:`, {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: [[{ text: "🏢 Biznes (Kompaniya)" }, { text: "👥 Mijoz (Foydalanuvchi)" }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else {
        const menu = users[chatId].role === 'biz' ? businessMenu : clientMenu;
        bot.sendMessage(chatId, "Xush kelibsiz!", menu);
    }
});

// Ro'yxatdan o'tish va rollarni ajratish
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === "🏢 Biznes (Kompaniya)") {
        users[chatId] = { role: 'biz', step: 'name' };
        bot.sendMessage(chatId, "Kompaniya (tashkilot) nomini kiriting:", { reply_markup: { remove_keyboard: true } });
    } 
    else if (text === "👥 Mijoz (Foydalanuvchi)") {
        users[chatId] = { role: 'client', step: 'done' };
        bot.sendMessage(chatId, "Siz mijoz sifatida ro'yxatdan o'tdingiz!", clientMenu);
    }

    // Biznes profilini to'ldirish
    if (users[chatId] && users[chatId].role === 'biz') {
        if (users[chatId].step === 'name' && text !== "🏢 Biznes (Kompaniya)") {
            companies[chatId] = { name: text, owner: chatId, avgTime: 15, queue: [] };
            users[chatId].step = 'done';
            bot.sendMessage(chatId, `✅ <b>${text}</b> profili yaratildi!\n\nEndi siz mijozlarni qabul qilishingiz mumkin.`, {
                parse_mode: "HTML",
                reply_markup: businessMenu.reply_markup
            });
        }
    }
});

// ====== NAVBAT LOGIKASI (Core Engine) ======

bot.on("message", (msg) => {
    const chatId = msg.chat.id;

    if (msg.text === "🔍 Joy qidirish") {
        const companyList = Object.values(companies);
        if (companyList.length === 0) {
            return bot.sendMessage(chatId, "Hozircha hech qanday kompaniya ro'yxatdan o'tmagan.");
        }

        const inline_keyboard = companyList.map(c => ([{
            text: `📍 ${c.name} (Kutish: ~${c.queue.length * c.avgTime} min)`,
            callback_data: `join_${c.owner}`
        }]));

        bot.sendMessage(chatId, "Navbatga turish uchun joyni tanlang:", {
            reply_markup: { inline_keyboard }
        });
    }

    if (msg.text === "⏭ Keyingi mijoz") {
        const company = companies[chatId];
        if (company && company.queue.length > 0) {
            const nextUser = company.queue.shift(); // Navbatdan birinchi odamni olish
            bot.sendMessage(chatId, `✅ Navbat yangilandi. Keyingi mijozga xabar yuborildi.`);
            bot.sendMessage(nextUser, "🔔 <b>Sizning navbatingiz keldi!</b>\nIltimos, xizmat ko'rsatish joyiga kiring.", { parse_mode: "HTML" });
            
            // Keyingilarga eslatma (Notification Engine)
            if (company.queue.length > 0) {
                company.queue.slice(0, 3).forEach((uId, index) => {
                    bot.sendMessage(uId, `ℹ️ Tayyor turing, sizdan oldin ${index + 1} kishi qoldi.`);
                });
            }
        } else {
            bot.sendMessage(chatId, "Navbat bo'sh.");
        }
    }
});

// Callback query (Navbatga yozilish)
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("join_")) {
        const ownerId = data.split("_")[1];
        const company = companies[ownerId];

        if (!company.queue.includes(chatId)) {
            company.queue.push(chatId);
            const pos = company.queue.length;
            bot.sendMessage(chatId, `✅ <b>Navbat olingan!</b>\n\n🏢 Joy: ${company.name}\n🔢 Sizning o'rningiz: ${pos}\n⏳ Taxminiy vaqt: ${pos * company.avgTime} daqiqa.`, { parse_mode: "HTML" });
        } else {
            bot.answerCallbackQuery(query.id, { text: "Siz allaqachon navbatdasiz!", show_alert: true });
        }
    }
});
