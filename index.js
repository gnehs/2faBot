const notp = require('notp'),
    fs = require('fs'),
    base32 = require('thirty-two'),
    jsonfile = require('jsonfile'),
    schedule = require('node-schedule')
if (!fs.existsSync('./config.json')) {
    console.error('no config.json')
    process.exit()
}
if (!fs.existsSync('./data.json')) {
    jsonfile.writeFileSync('data.json', {})
    console.log('created data.json')
}
var config = jsonfile.readFileSync('./config.json')
var data = jsonfile.readFileSync('./data.json')
var status = {}
const bot = new(require('node-telegram-bot-api'))(config.token, { polling: true });
bot.onText(/\/start/, (msg) => {
    let resp = `尼好，這裡是 2FA 機器人
/add 新增驗證碼
/del 移除驗證碼
/get 取得驗證碼
/cencel 取消`
    bot.sendMessage(msg.chat.id, resp, { reply_to_message_id: msg.message_id });
});
bot.onText(/\/add/, (msg) => {
    status[msg.chat.id] = {}
    status[msg.chat.id].status = "getSecret"
    bot.sendMessage(msg.chat.id, `輸入您的 secret 或是送出一張 QRCode`, { reply_to_message_id: msg.message_id });
});
bot.onText(/\/cencel/, (msg) => {
    status[msg.chat.id].status = false
    bot.sendMessage(msg.chat.id, `已取消`, { reply_to_message_id: msg.message_id });
});
bot.onText(/\/get/, msg => {
    let resp = `驗證碼：\n`
    for (let i in data[msg.chat.id].secret) {
        let name = data[msg.chat.id].secret[i].name,
            key = notp.totp.gen(data[msg.chat.id].secret[i].secret)
        resp += `<code>${key}</code> (${name})\n`
    }
    resp = data[msg.chat.id].secret.length > 0 ? resp : '尼沒新增驗證碼要拿什麼ㄋ\n使用 /add 新增驗證碼'
    bot.sendMessage(msg.chat.id, resp, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
});
bot.onText(/\/del/, msg => {
    let inline_keyboard = []
    for (let i in data[msg.chat.id].secret) {
        let name = data[msg.chat.id].secret[i].name
        inline_keyboard.push([{
            text: `❌ ${name}`,
            callback_data: JSON.stringify({
                "action": "del",
                "data": { "name": name, "index": i }
            })
        }])
    }
    let opts = { reply_markup: { inline_keyboard: inline_keyboard }, reply_to_message_id: msg.message_id };
    let resp = data[msg.chat.id].secret.length > 0 ? '尼今天要殺誰啊' : '沒東西能殺ㄌ\n使用 /add 新增驗證碼'
    bot.sendMessage(msg.from.id, resp, opts);
});
bot.on('callback_query', callbackQuery => {
    const callbackData = JSON.parse(callbackQuery.data);
    const msg = callbackQuery.message;
    if (callbackData.action == "del") {
        for (let i in data[msg.chat.id].secret) {
            if (data[msg.chat.id].secret[i].name == callbackData.data.name) {
                data[msg.chat.id].secret.splice(i, 1)
            }
        }
        bot.editMessageText(`${callbackData.data.name} 殺好了喔！`, {
            parse_mode: "HTML",
            chat_id: msg.chat.id,
            message_id: msg.message_id,
        });
    }
});
bot.on('message', (msg) => {
    if (!data[msg.chat.id])
        data[msg.chat.id] = { "secret": [] }
    if (status[msg.chat.id]) {
        let userData = userStatus(msg.chat.id)
        let status = userData.status
        switch (status) {
            case "getSecret":
                userStatus(msg.chat.id, { status: "setName", data: msg.text })
                let nowkey = notp.totp.gen(msg.text)
                bot.sendMessage(msg.chat.id, `目前的驗證碼是：<code>${nowkey}</code>\n請輸入一個名稱：`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
                break;
            case "setName":
                userStatus(msg.chat.id, { status: false })
                bot.sendMessage(msg.chat.id, `${msg.text} 設定完成！\n使用 /get 取得驗證碼`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
                data[msg.chat.id].secret.push({
                    "name": msg.text,
                    "secret": userData.data
                })
                break;
            default:
                userStatus(msg.chat.id, { status: false })
        }
    } else
        userStatus(msg.chat.id, { status: false })
})

schedule.scheduleJob('30 * * * * *', () => {
    console.log('data.json saved.')
    jsonfile.writeFileSync('data.json', data)
});

function userStatus(id, data) {
    if (data) status[id] = data
    else return status[id]
}