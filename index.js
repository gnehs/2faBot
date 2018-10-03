const notp = require('notp'),
    fs = require('fs'),
    base32 = require('thirty-two'),
    jsonfile = require('jsonfile')
if (!fs.existsSync('./config.json')) {
    console.error('no config.json')
    process.exit()
}
if (!fs.existsSync('./data.json')) {
    jsonfile.writeFileSync('data.json', { "hello": true }, { spaces: 2, EOL: '\r\n' })
    console.log('created data.json')
}
var config = jsonfile.readFileSync('./config.json')
var data = jsonfile.readFileSync('./data.json')
var status = {}
const bot = new(require('node-telegram-bot-api'))(config.token, { polling: true });
bot.onText(/\/start/, (msg) => {
    let resp = `尼好，我是 2FA 機器人
/add 來新增一個驗證碼
/del [id] 來移除驗證碼
/get 來取得驗證碼
/cencel 取消`
    bot.sendMessage(msg.chat.id, resp, { reply_to_message_id: msg.message_id });
});
bot.onText(/\/add/, (msg) => {
    status[msg.chat.id] = {}
    status[msg.chat.id].status = 'getSecret'
    bot.sendMessage(msg.chat.id, `輸入您的 secret 或是送出一張 QRCode`, { reply_to_message_id: msg.message_id });
});
bot.onText(/\/cencel/, (msg) => {
    status[msg.chat.id].status = false
    bot.sendMessage(msg.chat.id, `已取消`, { reply_to_message_id: msg.message_id });
});
bot.on('message', msg => {
    if (status[msg.chat.id]) {
        if (status[msg.chat.id].status == 'getSecret') {
            status[msg.chat.id].status = "setName"
            status[msg.chat.id].data = msg.text
            let nowkey = notp.totp.gen(msg.text)
            bot.sendMessage(msg.chat.id, `目前的驗證碼是：<code>${nowkey}</code>
請輸入一個名稱：`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
        }
        if (status[msg.chat.id].status == "setName") {
            data[msg.chat.id].secret.push({
                "name": msg.text,
                "secret": status[msg.chat.id].data
            })
            bot.sendMessage(msg.chat.id, `${msg.text} 設定完成！`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
            status[msg.chat.id].status = false
        }
    } else
        status[msg.chat.id] = {}
});