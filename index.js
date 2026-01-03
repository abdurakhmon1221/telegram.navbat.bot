const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ====== STORAGE (hozircha xotira) ======
const users = {};
const queues = {};
const userSteps = {};

// ====== MENULAR ======
function businessMenu(chatId) {
  bot.sendMessage(chatId, "🏢 Biznes menyu", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Navbat yaratish", callback_data: "CREATE_QUEUE" }]
      ]
    }
  });
}

function clientMenu(chatId) {
  bot.sendMessage(chatId, "👤 Mijoz menyu", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Navbatga qo‘shilish", callback_data: "JOIN_QUEUE" }],
        [{ text: "👀 Holatim", callback_data: "STATUS_QUEUE" }]
      ]
    }
  });
}

// ====== START ======
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!users[userId]) {
    bot.sendMessage(chatId, "Ro‘yxatdan o‘tamiz 📋", {
      reply_markup: {
        keyboard: [
          [{ text: "📱 Telefon raqamni yuborish", request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  } else {
    users[userId].role === "business"
      ? businessMenu(chatId)
      : clientMenu(chatId);
  }
});

// ====== CONTACT (RO‘YXATDAN O‘TISH) ======
bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  users[userId] = {
    id: userId,
    name: msg.from.first_name,
    phone: msg.contact.phone_number,
    role: null
  };

  bot.sendMessage(chatId, "Kim sifatida kirasan?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏢 Biznes", callback_data: "ROLE_BUSINESS" }],
        [{ text: "👤 Mijoz", callback_data: "ROLE_CLIENT" }]
      ]
    }
  });
});

// ====== CALLBACKS ======
bot.on("callback_query", (q) => {
  const chatId = q.message.chat.id;
  const userId = q.from.id;

  // ROLE
  if (q.data === "ROLE_BUSINESS") {
    users[userId].role = "business";
    bot.sendMessage(chatId, "🏢 Biznes akkaunt tayyor");
    businessMenu(chatId);
  }

  if (q.data === "ROLE_CLIENT") {
    users[userId].role = "client";
    bot.sendMessage(chatId, "👤 Mijoz akkaunt tayyor");
    clientMenu(chatId);
  }

  // BUSINESS
  if (q.data === "CREATE_QUEUE") {
    userSteps[userId] = "CREATE_QUEUE";
    bot.sendMessage(chatId, "Navbat nomini yoz:");
  }

  // CLIENT
  if (q.data === "JOIN_QUEUE") {
    userSteps[userId] = "JOIN_QUEUE";
    bot.sendMessage(chatId, "Navbat kodini yoz:");
  }

  if (q.data === "STATUS_QUEUE") {
    userSteps[userId] = "STATUS_QUEUE";
    bot.sendMessage(chatId, "Navbat kodini yoz:");
  }
});

// ====== TEXT INPUT ======
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!userSteps[userId]) return;

  // CREATE QUEUE
  if (userSteps[userId] === "CREATE_QUEUE") {
    const queueId = Math.random().toString(36).substring(7);

    queues[queueId] = {
      name: text,
      admin: userId,
      users: []
    };

    bot.sendMessage(
      chatId,
      `✅ Navbat yaratildi\n📌 ${text}\n🔑 Kodi: ${queueId}`
    );

    delete userSteps[userId];
    businessMenu(chatId);
  }

  // JOIN QUEUE
  if (userSteps[userId] === "JOIN_QUEUE") {
    const queue = queues[text];

    if (!queue) {
      bot.sendMessage(chatId, "❌ Bunday navbat yo‘q");
      return;
    }

    if (queue.users.find(u => u.id === userId)) {
      bot.sendMessage(chatId, "Sen allaqachon navbatdasan");
      delete userSteps[userId];
      return;
    }

    queue.users.push({
      id: userId,
      name: users[userId].name
    });

    bot.sendMessage(
      chatId,
      `✅ Navbatga qo‘shilding\nOldingda ${queue.users.length - 1} ta odam bor`
    );

    delete userSteps[userId];
    clientMenu(chatId);
  }

  // STATUS
  if (userSteps[userId] === "STATUS_QUEUE") {
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
    clientMenu(chatId);
  }
});

// ====== NEXT (ADMIN COMMAND) ======
bot.onText(/\/next (.+)/, (msg, match) => {
  const queue = queues[match[1]];
  const chatId = msg.chat.id;

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
