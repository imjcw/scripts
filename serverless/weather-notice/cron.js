import { store } from "napkin"
const axios = require('axios')

// 钉钉机器人消息
const robotNotice = async (content) => {
  const url = ((await axios({
    url: process.env.FAAS_URL + process.env.DINGTALK_SIGN_URI + `?token=` + process.env.DINGTALK_TOKEN + `&secret=` + process.env.DINGTALK_SECRET
  })).data || {}).url
  return axios.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(content)
  })
}

const today = () => {
  const date = new Date()
  date.setHours(date.getHours() + 8)
  const year = date.getFullYear()
  const month = date.getMonth() < 9 ? '0' + (1 + date.getMonth()) : (1 + date.getMonth())
  const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
  return year + `-` + month + `-` + day
}

const isWorkDay = async () => {
  try {
    const calendar = (await axios.get("https://raw.githubusercontent.com/imjcw/scripts/master/files/calendar/" + (new Date()).getFullYear() + "-holidays.json")).data
    return calendar.holidays.indexOf(today()) == "-1"
  } catch(e) {
    console.error(e)
    return {}
  }
}

export default async () => {
  const data = (await store.get("weather-notice")).data || {}
  if ((data.date || "") != today()) {
    return
  }
  const weather = data.weather
  const rain = data.rain
  const message = {
    morning: {
      hasRain: false,
      temperatureBegin: "",
      temperatureEnd: ""
    },
    night: {
      hasRain: false,
      temperatureBegin: "",
      temperatureEnd: ""
    }
  }
  const workday = isWorkDay()
  weather[0].forEach(row => {
    const hour = row.jf.substring(8)
    if (["07", "08", "09"].indexOf(hour) != -1) {
      message.morning.hasRain = rain.indexOf(row.ja) != "-1"
      message.morning.temperatureBegin = Math.min(row.jb, message.morning.temperatureBegin ? message.morning.temperatureBegin : row.jb)
      message.morning.temperatureEnd = Math.max(row.jb, message.morning.temperatureEnd)
    }
    if (["18", "19", "20", "21"].indexOf(hour) != -1) {
      message.night.hasRain = rain.indexOf(row.ja) != "-1"
      message.night.temperatureBegin = Math.min(row.jb, message.night.temperatureBegin ? message.night.temperatureBegin : row.jb)
      message.night.temperatureEnd = Math.max(row.jb, message.night.temperatureEnd)
    }
  })
  let content = []
  if (message.morning.hasRain || message.night.hasRain) {
    content.push(workday ? "今天出行时间有雨, 记得带雨伞" : "今天有雨，出门记得带伞")
  }
  content.push("今天早晨温度: " + (message.morning.temperatureBegin == message.morning.temperatureEnd ? message.morning.temperatureBegin : message.morning.temperatureBegin + "~" + message.morning.temperatureEnd) + "°C")
  content.push("今天晚上温度: " + (message.night.temperatureBegin == message.night.temperatureEnd ? message.night.temperatureBegin : message.night.temperatureBegin + "~" + message.night.temperatureEnd) + "°C")
  content.push("")
  console.log((await robotNotice({
    msgtype: 'text',
    text: {
      content: content.join("\n")
    },
    at: {
      "isAtAll": true
    }
  })).data || {})
}
