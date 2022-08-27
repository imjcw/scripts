const axios = require('axios')

const getPage = async () => {
  return (await axios.get("http://www.weather.com.cn/weather1dn/101020800.shtml")).data
}

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
  });
}

const isWorkDay = async () => {
    try {
        return ((await axios({
            url: process.env.FAAS_URL + `today-is-workday`
        })).data || {}).isWorkday
    } catch (error) {
        return true
    }
}

/**
* @param {NapkinRequest} req
* @param {NapkinResponse} res
*/
export default async (req, res) => {
  const preg = /hour3data\s{0,}=\s{0,}(.*)/
  const weather = JSON.parse(preg.exec(await getPage())[1].split(";")[0])
  const rain = [3,4,5,6,7,8,9,"03","04","05","06","07","08","09",10,11,12,19,21,22,23,24,25,97,301]
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
