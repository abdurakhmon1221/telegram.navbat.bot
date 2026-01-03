const TelegramBot = require("node-telegram-bot-api");
require('dotenv').config();

// Tokenni .env dan oling yoki string sifatida qo'ying
const token = process.env.BOT_TOKEN || "8365247379:AAHe3d6nydd1flbY5Ng6x5t_JHblxE5IAiE";
const bot = new TelegramBot(token, { polling: true });

// ====== MA'LUMOTLAR OMBORI ======
// Real loyihada buni MongoDB yoki PostgreSQL ga almashtirish kerak
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
    
    if (!users[chatId]) {
        bot.sendMessage(chatId, `<b>Assalomu alaykum ${msg.from.first_name}!</b>\n\nPlatformaga xush kelibsiz. Rolingizni tanlang:`, {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: [[{ text: "🏢 Biznes (Kompaniya)" }, { text: "👥 Mijoz (Foydalanuvchi)" }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else {
        const menu = users[chatId].role === 'biz' ? businessMenu : clientMenu;
        bot.sendMessage(chatId, "Asosiy menyuga qaytdingiz.", menu);
    }
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // 1. Ro'yxatdan o'tish boshlanishi
    if (text === "🏢 Biznes (Kompaniya)") {
        users[chatId] = { role: 'biz', step: 'waiting_name' };
        return bot.sendMessage(chatId, "Kompaniya (tashkilot) nomini kiriting:", { reply_markup: { remove_keyboard: true } });
    } 
    
    if (text === "👥 Mijoz (Foydalanuvchi)") {
        users[chatId] = { role: 'client', step: 'completed' };
        return bot.sendMessage(chatId, "Siz mijoz sifatida ro'yxatdan o'tdingiz!", clientMenu);
    }

    // 2. Biznes profilini yaratish (Step-by-step)
    if (users[chatId] && users[chatId].step === 'waiting_name') {
        companies[chatId] = { 
            name: text, 
            owner: chatId, 
            avgTime: 15, 
            queue: [],
            rating: 5.0,
            reviews: []
        };
        users[chatId].step = 'completed';
        return bot.sendMessage(chatId, `✅ <b>${text}</b> profili yaratildi!`, {
            parse_mode: "HTML",
            reply_markup: businessMenu
        });
    }

    // 3. Mijoz funksiyalari
    if (text === "🔍 Joy qidirish") {
        const companyList = Object.values(companies);
        if (companyList.length === 0) return bot.sendMessage(chatId, "Hozircha faol joylar yo'q.");

        const inline_keyboard = companyList.map(c => ([{
            text: `📍 ${c.name} (Navbat: ${c.queue.length} kishi)`,
            callback_data: `join_${c.owner}`
        }]));

        bot.sendMessage(chatId, "Qayerga navbat olmoqchisiz?", { reply_markup: { inline_keyboard } });
    }

    // 4. Biznes funksiyalari (Navbatni boshqarish)
    if (text === "⏭ Keyingi mijoz") {
        const company = companies[chatId];
        if (company && company.queue.length > 0) {
            const nextUserId = company.queue.shift(); // Birinchi odamni olish
            
            bot.sendMessage(chatId, `✅ Mijoz chaqirildi. Navbatda ${company.queue.length} kishi qoldi.`);
            bot.sendMessage(nextUserId, "🔔 <b>Sizning navbatingiz keldi!</b>\nIltimos, xonaga kiring.", { parse_mode: "HTML" });

            // Eslatma logikasi: Navbatda turgan keyingi odamlarga xabar berish
            company.queue.forEach((uId, index) => {
                if (index === 0) bot.sendMessage(uId, "⏳ <b>Tayyor turing!</b> Siz keyingi navbatdasiz.", { parse_mode: "HTML" });
                if (index === 2) bot.sendMessage(uId, "ℹ️ Sizdan oldin 2 kishi qoldi. Taxminan 15 daqiqadan so'ng navbatingiz keladi.");
            });
        } else {
            bot.sendMessage(chatId, "Navbat hozircha bo'sh.");
        }
    }
});

// 5. Callback Query (Navbatga qo'shilish)
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("join_")) {
        const ownerId = data.split("_")[1];
        const company = companies[ownerId];

        if (company.queue.includes(chatId)) {
            return bot.answerCallbackQuery(query.id, { text: "Siz allaqachon navbatdasiz!", show_alert: true });
        }

        company.queue.push(chatId);
        const pos = company.queue.length;
        const waitTime = pos * company.avgTime;

        bot.sendMessage(chatId, 
            `✅ <b>Navbat olingan!</b>\n\n` +
            `🏢 Joy: ${company.name}\n` +
            `🔢 Raqamingiz: <b>${pos}</b>\n` +
            `⏳ Kutish vaqti: ~${waitTime} daqiqa.`, 
            { parse_mode: "HTML" }
        );
        bot.answerCallbackQuery(query.id);
    }
});
