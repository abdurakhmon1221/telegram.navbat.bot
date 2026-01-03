const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let queues = {};
let userSteps = {};

// ===== MAIN MENU FUNCTION =====
function sendMainMenu(chatId) {
  bot.sendMessage(chatId, "Asosiy menyu", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "▶️ Navbat yaratish", callback_data: "CREATE" }],
        [{ text: "➕ Navbatga qo‘shilish", callback_data: "JOIN" }],
        [{ text: "👀 Holatim", callback_data: "STATUS" }]
      ]
    }
  });
}

// ================= START =================
bot.onText(/\/start/, (msg) => {
  sendMainMenu(msg.chat.id);
});

// ================= NEXT USER (ADMIN) =================
bot.onText(/\/next (.+)/, (msg, match) => {
  const queue = queues[match[1]];
  const chatId = msg.chat.id;

  if (!queue) return bot.sendMessage(chatId, "Navbat topilmadi");
  if (msg.from.id !== queue.admin) return bot.sendMessage(chatId, "Bu navbat seniki emas");
  if (queue.users.length === 0) return bot.sendMessage(chatId, "Navbat bo‘sh");

  const nextUser = queue.users.shift();
  bot.sendMessage(chatId, `🎉 ${nextUser.name}, navbating keldi`);
  sendMainMenu(chatId);
});

// ================= STATUS COMMAND =================
bot.onText(/\/status (.+)/, (msg, match) => {
  const queue = queues[match[1]];
  const chatId = msg.chat.id;

  if (!queue) return bot.sendMessage(chatId, "Navbat topilmadi");

  const index = queue.users.findIndex(u => u.id === msg.from.id);
  if (index === -1) return bot.sendMessage(chatId, "Sen bu navbatda yo‘qsan");

  bot.sendMessage(chatId, `👀 Oldingda ${index} ta odam bor`);
  sendMainMenu(chatId);
});

// ================= BUTTON HANDLER =================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (query.data === "CREATE") {
    userSteps[userId] = "CREATE";
    bot.sendMessage(chatId, "Navbat nomini yoz");
  }

  if (query.data === "JOIN") {
    userSteps[userId] = "JOIN";
    bot.sendMessage(chatId, "Navbat kodini yoz");
  }

  if (query.data === "STATUS") {
    userSteps[userId] = "STATUS";
    bot.sendMessage(chatId, "Navbat kodini yoz");
  }

  if (query.data === "MENU") {
    sendMainMenu(chatId);
  }
});

// ================= TEXT INPUT HANDLER =================
bot.on("message", (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  if (!userSteps[userId]) return;

  // CREATE
  if (userSteps[userId] === "CREATE") {
    const queueId = Math.random().toString(36).substring(7);
    queues[queueId] = {
      name: msg.text,
      admin: userId,
      users: []
    };

    bot.sendMessage(chatId, `✅ Navbat yaratildi\n🔑 Kodi: ${queueId}`);
    delete userSteps[userId];
    sendMainMenu(chatId);
  }

  // JOIN
  else if (userSteps[userId] === "JOIN") {
    const queue = queues[msg.text];
    if (!queue) return bot.sendMessage(chatId, "Navbat topilmadi");

    queue.users.push({ id: userId, name: msg.from.first_name });
    bot.sendMessage(chatId, "✅ Navbatga qo‘shilding");
    delete userSteps[userId];
    sendMainMenu(chatId);
  }

  // STATUS
  else if (userSteps[userId] === "STATUS") {
    const queue = queues[msg.text];
    if (!queue) return bot.sendMessage(chatId, "Navbat topilmadi");

    const index = queue.users.findIndex(u => u.id === userId);
    bot.sendMessage(chatId, index === -1
      ? "Sen bu navbatda yo‘qsan"
      : `👀 Oldingda ${index} ta odam bor`
    );

    delete userSteps[userId];
    sendMainMenu(chatId);
  }
});
