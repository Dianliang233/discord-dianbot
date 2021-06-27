import Discord from 'discord.js'
import 'dotenv/config.js'
import * as fs from 'fs'
import { JSDOM } from 'jsdom'
import axios from 'axios'

const client = new Discord.Client()

const webhookClient = new Discord.WebhookClient(
  process.env.WEBHOOK_ID,
  process.env.WEBHOOK_TOKEN
)

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
      storage = {
        wikis: [],
      }
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

setInterval(() => {
  let ogWikis = storage.wikis
  axios
    .get(
      'https://community.fandom.com/wiki/Special:NewWikis?language=zh&limit=15&uselang=qqx&useskin=fallback'
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

  let diff = []
  ogWikis.forEach((og) => {
    storage.wikis.forEach((ne) => {
      if (og.url !== ne.url) {
        diff.push(ne)
      }
    })
  })

  let wikiEmbeds = []
  diff.forEach(async (i) => {
    let wikiDetail = {}
    axios
      .get(`${i.url}api/v1/Mercury/WikiVariables`)
      .then((res) => {
        let d = res.data
        wikiDetail = {
          id: d.data.id,
          vertical: d.data.vertical,
          icon: d.data.appleTouchIcon,
          lang: d.data.language.content,
          founder: {},
          name: i.name,
          url: i.url,
        }
      })
      .catch(console.error)
    axios
      .get(`${i.url}api.php?action=query&list=allusers&augroup=bureaucrat`)
      .then((res) => {
        let d = res.data
        wikiDetail.founder = {
          username: d.query.allusers.name,
          uid: d.query.allusers.id,
        }
        axios
          .get(`${i.url}api/v1/User/Details?ids=${wikiDetail.founder.uid}`)
          .then((res) => {
            let d = res.data
            wikiDetail.founder.avatar = d.items[0].avatar
          })
          .catch(console.error)
      })
      .catch(console.error)

    wikiEmbeds.push(
      new Discord.MessageEmbed({
        color: '#0099ff',
        title: wikiDetail.name,
        description: 'A new wiki',
        url: wikiDetail.url,
        author: {
          name: wikiDetail.founder.username + ` (${wikiDetail.founder.uid})`,
          iconURL: wikiDetail.founder.avatar,
          url: `${wikiDetail.url}wiki/User:${wikiDetail.founder.username}`,
        },
        fields: [
          {
            name: 'City ID',
            value: '`' + wikiDetail.id + '`',
            inline: true,
          },
        ],
        footer: {
          name: 'Dianbot',
          iconURL:
            'https://cdn.discordapp.com/avatars/739100868141514773/26a7a008ad0eda15347cee8b047166a0.webp?size=256',
        },
      }).setTimestamp()
    )
  })

  webhookClient.send(':new: New ZH wiki!', {
    usernasme: 'Dianbot - New ZH Wiki',
    avatarURL:
      'https://cdn.discordapp.com/avatars/739100868141514773/26a7a008ad0eda15347cee8b047166a0.webp?size=256',
    embeds: [wikiEmbeds],
    allowedMentions: false,
  })
}, 5000)

function save() {
  fs.writeFile(
    'storage.json',
    JSON.stringify(storage),
    { flag: 'w' },
    function (err) {
      if (err) {
        console.error(err)
      } else {
        console.log('Data saved.')
      }
    }
  )
}

client.login(process.env.BOT_TOKEN)
