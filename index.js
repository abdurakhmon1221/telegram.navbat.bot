const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let queues = {};

// START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Nima qilamiz?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Navbatga qo‘shilish", callback_data: "JOIN" }],
        [{ text: "▶️ Navbat yaratish", callback_data: "CREATE" }],
        [{ text: "👀 Holatim", callback_data: "STATUS" }]
      ]
    }
  });
});

// CREATE QUEUE
bot.onText(/\/create (.+)/, (msg, match) => {
  const name = match[1];
  const chatId = msg.chat.id;

  const queueId = Math.random().toString(36).substring(7);

  queues[queueId] = {
    name: name,
    admin: msg.from.id,
    users: []
  };

  bot.sendMessage(
    chatId,
    `Navbat yaratildi 🎉\nNomi: ${name}\nKodi: ${queueId}`
  );
});

// JOIN QUEUE
bot.onText(/\/join (.+)/, (msg, match) => {
  const queueId = match[1];
  const chatId = msg.chat.id;

  const queue = queues[queueId];

  if (!queue) {
    bot.sendMessage(chatId, "Bunday navbat yo‘q 😢");
    return;
  }

  queue.users.push({
  id: msg.from.id,
  name: msg.from.first_name
});

  bot.sendMessage(
    chatId,
    `Navbatga qo‘shilding ✅\nOldingda ${queue.users.length - 1} ta odam bor`
  );
});

// NEXT USER (ADMIN ONLY)
bot.onText(/\/next (.+)/, (msg, match) => {
  const queueId = match[1];
  const chatId = msg.chat.id;

  const queue = queues[queueId];

  if (!queue) {
    bot.sendMessage(chatId, "Navbat topilmadi");
    return;
  }

  if (msg.from.id !== queue.admin) {
    bot.sendMessage(chatId, "Bu navbat seniki emas 😤");
    return;
  }

  if (queue.users.length === 0) {
    bot.sendMessage(chatId, "Navbat bo‘sh");
    return;
  }

  const nextUser = queue.users.shift();
bot.sendMessage(chatId, `${nextUser.name}, navbating keldi 🎉`);
});
bot.onText(/\/status (.+)/, (msg, match) => {
  const queueId = match[1];
  const chatId = msg.chat.id;

  const queue = queues[queueId];

  if (!queue) {
    bot.sendMessage(chatId, "Navbat topilmadi");
    return;
  }

  const index = queue.users.findIndex(u => u.id === msg.from.id);

  if (index === -1) {
    bot.sendMessage(chatId, "Sen bu navbatda yo‘qsan");
    return;
  }

  bot.sendMessage(
    chatId,
    `Sening navbating 👀\nOldingda ${index} ta odam bor`
  );
});
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "CREATE") {
    bot.sendMessage(chatId, "Navbat nomini yoz:\n/create Klinika");
  }

  if (query.data === "JOIN") {
    bot.sendMessage(chatId, "Navbat kodini yoz:\n/join abc123");
  }

  if (query.data === "STATUS") {
    bot.sendMessage(chatId, "Navbat kodini yoz:\n/status abc123");
  }
});
bot.sendMessage(chatId,
  `Navbat yaratildi 🎉\nNomi: ${name}\nKodi: ${queueId}`,
  {
    reply_markup: {
      inline_keyboard: [
        [{ text: "➡️ Keyingi odam", callback_data: `NEXT_${queueId}` }]
      ]
    }
  }
);
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (query.data.startsWith("NEXT_")) {
    const queueId = query.data.replace("NEXT_", "");
    const queue = queues[queueId];

    if (!queue) {
      bot.sendMessage(chatId, "Navbat yo‘q");
      return;
    }

    if (queue.admin !== userId) {
      bot.sendMessage(chatId, "Bu tugma sen uchun emas 😑");
      return;
    }

    if (queue.users.length === 0) {
      bot.sendMessage(chatId, "Navbat bo‘sh");
      return;
    }

    const nextUser = queue.users.shift();
    bot.sendMessage(chatId, `${nextUser.name}, navbating keldi 🎉`);
  }
});
