const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let queues = {};

// ================= START =================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Nima qilamiz?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "▶️ Navbat yaratish", callback_data: "CREATE" }],
        [{ text: "➕ Navbatga qo‘shilish", callback_data: "JOIN" }],
        [{ text: "👀 Holatim", callback_data: "STATUS" }]
      ]
    }
  });
});

// ================= CREATE QUEUE =================
bot.onText(/\/create (.+)/, (msg, match) => {
  const name = match[1];
  const chatId = msg.chat.id;

  const queueId = Math.random().toString(36).substring(7);

  queues[queueId] = {
    name,
    admin: msg.from.id,
    users: []
  };

  bot.sendMessage(
    chatId,
    `✅ Navbat yaratildi\n\n📌 Nomi: ${name}\n🔑 Kodi: ${queueId}`
  );
});

// ================= JOIN QUEUE =================
bot.onText(/\/join (.+)/, (msg, match) => {
  const queueId = match[1];
  const chatId = msg.chat.id;
  const queue = queues[queueId];

  if (!queue) {
    bot.sendMessage(chatId, "❌ Bunday navbat yo‘q");
    return;
  }

  const exists = queue.users.find(u => u.id === msg.from.id);
  if (exists) {
    bot.sendMessage(chatId, "Sen allaqachon navbatdasan 😐");
    return;
  }

  queue.users.push({
    id: msg.from.id,
    name: msg.from.first_name
  });

  bot.sendMessage(
    chatId,
    `✅ Navbatga qo‘shilding\nOldingda ${queue.users.length - 1} ta odam bor`
  );
});

// ================= NEXT USER (ADMIN) =================
bot.onText(/\/next (.+)/, (msg, match) => {
  const queueId = match[1];
  const chatId = msg.chat.id;
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

// ================= STATUS =================
bot.onText(/\/status (.+)/, (msg, match) => {
  const queueId = match[1];
  const chatId = msg.chat.id;
  const queue = queues[queueId];

  if (!queue) {
    bot.sendMessage(chatId, "❌ Navbat topilmadi");
    return;
  }

  const index = queue.users.findIndex(u => u.id === msg.from.id);

  if (index === -1) {
    bot.sendMessage(chatId, "Sen bu navbatda yo‘qsan");
    return;
  }

  bot.sendMessage(
    chatId,
    `👀 Sening holating\nOldingda ${index} ta odam bor`
  );
});

// ================= BUTTON HANDLER =================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (query.data === "CREATE") {
    userSteps[userId] = "WAITING_QUEUE_NAME";
    bot.sendMessage(chatId, "Navbat nomini yoz (masalan: Klinika)");
  }

  if (query.data === "JOIN") {
    userSteps[userId] = "WAITING_QUEUE_CODE";
    bot.sendMessage(chatId, "Navbat kodini yoz");
  }

  if (query.data === "STATUS") {
    userSteps[userId] = "WAITING_STATUS_CODE";
    bot.sendMessage(chatId, "Navbat kodini yoz");
  }
});

bot.on("message", (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  if (!userSteps[userId]) return;

  // CREATE
  if (userSteps[userId] === "WAITING_QUEUE_NAME") {
    const name = msg.text;
    const queueId = Math.random().toString(36).substring(7);

    queues[queueId] = {
      name,
      admin: userId,
      users: []
    };

    bot.sendMessage(
      chatId,
      `✅ Navbat yaratildi\n📌 Nomi: ${name}\n🔑 Kodi: ${queueId}`
    );

    delete userSteps[userId];
  }

  // JOIN
  else if (userSteps[userId] === "WAITING_QUEUE_CODE") {
    const queue = queues[msg.text];

    if (!queue) {
      bot.sendMessage(chatId, "❌ Bunday navbat yo‘q");
      return;
    }

    queue.users.push({
      id: userId,
      name: msg.from.first_name
    });

    bot.sendMessage(chatId, "✅ Navbatga qo‘shilding");
    delete userSteps[userId];
  }

  // STATUS
  else if (userSteps[userId] === "WAITING_STATUS_CODE") {
    const queue = queues[msg.text];

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
  }
});
