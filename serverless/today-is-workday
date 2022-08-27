const axios = require("axios")

const calendar = async () => {
  try {
    return (await axios.get("https://raw.githubusercontent.com/imjcw/scripts/master/files/calendar/" + (new Date()).getFullYear() + "-holidays.json")).data
  } catch(e) {
    console.error(e)
    return {}
  }
}
/**
* @param {NapkinRequest} req
* @param {NapkinResponse} res
*/
export default async (req, res) => {
  const date = new Date()
  date.setHours(date.getHours() + 8)
  const year = date.getFullYear()
  const month = date.getMonth() < 9 ? '0' + (1 + date.getMonth()) : (1 + date.getMonth())
  const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
  res.json({"isWorkday": (await calendar()).holidays.indexOf(year + `-` + month + `-` + day) == "-1"})
}
