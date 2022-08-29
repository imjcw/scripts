const axios = require('axios')
import { store } from "napkin"

const getPage = async () => {
  return (await axios.get("http://www.weather.com.cn/weather1dn/101020800.shtml")).data
}

const today = () => {
  const date = new Date()
  date.setHours(date.getHours() + 8)
  const year = date.getFullYear()
  const month = date.getMonth() < 9 ? '0' + (1 + date.getMonth()) : (1 + date.getMonth())
  const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
  return year + `-` + month + `-` + day
}

/**
* @param {NapkinRequest} req
* @param {NapkinResponse} res
*/
export default async (req, res) => {
  const preg = /hour3data\s{0,}=\s{0,}(.*)/
  const weather = JSON.parse(preg.exec(await getPage())[1].split(";")[0])
  const rain = [3,4,5,6,7,8,9,"03","04","05","06","07","08","09",10,11,12,19,21,22,23,24,25,97,301]
  store.put("weather-notice", {
    date: today(),
    weather: weather,
    rain: rain
  })
  console.log(await store.get("weather-notice"))
}
