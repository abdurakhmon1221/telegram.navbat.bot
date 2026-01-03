const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const queues = {};
const userSteps = {};

// ================== MAIN MENU ==================
function sendMainMenu(chatId) {
  bot.sendMessage(chatId, "Nima qilamiz?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏢 Navbat yaratish", callback_data: "CREATE" }],
        [{ text: "➕ Navbatga qo‘shilish", callback_data: "JOIN" }],
        [{ text: "👀 Holatim", callback_data: "STATUS" }]
      ]
    }
  });
}

// ================== START ==================
bot.onText(/\/start/, (msg) => {
  sendMainMenu(msg.chat.id);
});

// ================== BUTTONS ==================
bot.on("callback_query", (q) => {
  const chatId = q.message.chat.id;
  const userId = q.from.id;

  if (q.data === "CREATE") {
    userSteps[userId] = "CREATE_NAME";
    bot.sendMessage(chatId, "Navbat nomini yoz:");
  }

  if (q.data === "JOIN") {
    userSteps[userId] = "JOIN_CODE";
    bot.sendMessage(chatId, "Navbat kodini yoz:");
  }

  if (q.data === "STATUS") {
    userSteps[userId] = "STATUS_CODE";
    bot.sendMessage(chatId, "Navbat kodini yoz:");
  }
});

// ================== TEXT HANDLER ==================
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!userSteps[userId]) return;

  // -------- CREATE QUEUE --------
  if (userSteps[userId] === "CREATE_NAME") {
    const queueId = Math.random().toString(36).substring(7);

    queues[queueId] = {
      name: text,
      admin: userId,
      users: []
    };

    bot.sendMessage(
      chatId,
      `✅ Navbat yaratildi\n📌 Nomi: ${text}\n🔑 Kodi: ${queueId}`
    );

    delete userSteps[userId];
    sendMainMenu(chatId);
  }

  // -------- JOIN QUEUE --------
  else if (userSteps[userId] === "JOIN_CODE") {
    const queue = queues[text];

    if (!queue) {
      bot.sendMessage(chatId, "❌ Bunday navbat yo‘q");
      return;
    }

    const exists = queue.users.find(u => u.id === userId);
    if (exists) {
      bot.sendMessage(chatId, "Sen allaqachon navbatdasan");
      delete userSteps[userId];
      return;
    }

    queue.users.push({
      id: userId,
      name: msg.from.first_name
    });

    bot.sendMessage(
      chatId,
      `✅ Navbatga qo‘shilding\nOldingda ${queue.users.length - 1} ta odam bor`
    );

    delete userSteps[userId];
    sendMainMenu(chatId);
  }

  // -------- STATUS --------
  else if (userSteps[userId] === "STATUS_CODE") {
    const queue = queues[text];

    if (!queue) {
      bot.sendMessage(chatId, "❌ Navbat topilmadi");
      return;
    }

    const index = queue.users.findIndex(u => u.id === userId);

    if (index === -1) {
      bot.sendMessage(chatId, "Sen bu navbatda yo‘qsan");
    } else {
      bot.sendMessage(chatId, `👀 Oldingda ${index} ta odam bor`);
    }

    delete userSteps[userId];
    sendMainMenu(chatId);
  }
});

// ================== NEXT (ADMIN) ==================
bot.onText(/\/next (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const queueId = match[1];
  const queue = queues[queueId];

  if (!queue) {
    bot.sendMessage(chatId, "❌ Navbat topilmadi");
    return;
  }

  if (msg.from.id !== queue.admin) {
    bot.sendMessage(chatId, "⛔ Bu navbat seniki emas");
    return;
  }

  if (queue.users.length === 0) {
    bot.sendMessage(chatId, "Navbat bo‘sh");
    return;
  }

  const nextUser = queue.users.shift();
  bot.sendMessage(chatId, `🎉 ${nextUser.name}, navbating keldi`);
});
