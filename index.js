import Discord from 'discord.js'
import 'dotenv/config.js'
import 'global-agent/bootstrap.js'
import * as fs from 'fs'
import { JSDOM } from 'jsdom'
import axios from 'axios'

const client = new Discord.Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
})

let storage
fs.readFile(
  'storage.json',
  { encoding: 'utf-8', flag: 'w+' },
  function (err, data) {
    if (err) {
      return console.error(err)
    }
    try {
      storage = JSON.parse(data)
    } catch {
      storage = {}
      save()
    }
  }
)

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on('message', async (message) => {
  if (message.content === '&ping') {
    message.channel.send('Pong.')
    try {
      await message.react('✅')
    } catch (error) {
      console.error('One of the emojis failed to react:', error)
    }
  }
})

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.message.channel.id !== '858373176840814642') {
    return null
  }
  // if (reaction.message.id)
  if (reaction.partial) {
    try {
      await reaction.fetch()
    } catch (error) {
      console.error('Something went wrong when fetching the message: ', error)
      // Return as `reaction.message.author` may be undefined/null
      return
    }
  }
  // Now the message has been cached and is fully available
  console.log(
    `${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`
  )
  // The reaction is now also fully available and the properties will be reflected accurately:
  console.log(
    `${reaction.count} user(s) have given the same reaction to this message!`
  )
})

setInterval(() => {
  axios
    .get(
      'https://community.fandom.com/wiki/Special:NewWikis?language=zh&limit=5&uselang=qqx&useskin=fallback'
    )
    .then((res) => {
      let dom = new JSDOM(res.data)
      let wikis = storage.wikis
      dom.window.document.querySelectorAll('ul li a').forEach((ele) => {
        wikis.push({
          url: ele.attributes.href.value,
          name: ele.innerHTML,
        })
      })
      storage.wikis = wikis
      save()
    })
    .catch(console.error)
}, 5000)

function sendMessage(text) {
  new Discord.TextChannel(
    new Discord.Guild(client, { id: '614402285895811082' }),
    { id: '858373176840814642' }
  )
    .send(text)
    .then((message) => console.log(`Sent message: ${message.content}`))
    .catch(console.error)
}

function save() {
  fs.writeFile('storage.json', JSON.stringify(storage), { flag: 'w' }, function (err) {
    if (err) {
      console.error(err)
    } else {
      console.log('Data saved.')
    }
  })
}

client.login(process.env.BOT_TOKEN)
