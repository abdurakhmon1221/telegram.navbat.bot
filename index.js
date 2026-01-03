const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let queues = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Salom! /join bilan navbatga qo‘shil.");
});

bot.onText(/\/join/, (msg) => {
  queue.push(msg.from.first_name);
  bot.sendMessage(msg.chat.id, `Navbatga qo‘shilding. Oldingda ${queue.length - 1} ta odam bor.`);
});

bot.onText(/\/next/, (msg) => {
  if (queue.length === 0) {
    bot.sendMessage(msg.chat.id, "Navbat bo‘sh.");
  } else {
    const next = queue.shift();
    bot.sendMessage(msg.chat.id, `${next} navbating keldi!`);
  }
});
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
