/**
 * 掘金签到、抽奖、沾福气每日执行脚本
 * 
 * 环境变量说明
 * COOKIE_TOKEN  掘金的用户COOKIE，登录后，可以从任一请求上获取
 * DINGTALK_TOKEN  钉钉机器人的 access_token
 * DINGTALK_SECRET  钉钉机器人的 secret
 * DINGTALK_SIGN_URL  钉钉机器人签名function serverless服务地址，可见(https://github.com/imjcw/scripts/blob/master/serverless/dingtalk-robot/sign.js)
*/
const axios = require('axios');

// 掘金的接口
const checkInApi = "https://api.juejin.cn/growth_api/v1/check_in"
const drawApi = "https://api.juejin.cn/growth_api/v1/lottery/draw"
const dipApi = "https://api.juejin.cn/growth_api/v1/lottery_lucky/dip_lucky?aid=2608&uuid=7052888125034677763&spider=0"

// 掘金PC站登录后，获取请求的COOKIE
const cookieInfo = process.env.COOKIE_TOKEN

// 请求签到接口
const checkIn = async () => {
  let {data} = await axios({url: checkInApi, method: 'post', headers: {Cookie: cookieInfo}});
  return data
}
// 请求抽奖接口
const draw = async () => {
  let {data} = await axios({ url: drawApi, method: 'post', headers: { Cookie: cookieInfo } });
  return data
}
// 请求沾福气接口
const dip = async () => {
  let {data} = await axios({ url: dipApi, method: 'post', data: {"lottery_history_id":"7135239197383720973"},  headers: { Cookie: cookieInfo } });
  return data
}


// 钉钉机器人消息
const robotNotice = async (content) => {
  const url = ((await axios({
    url: process.env.DINGTALK_SIGN_URL + `?token=` + process.env.DINGTALK_TOKEN + `&secret=` + process.env.DINGTALK_SECRET
  })).data || {}).url
  return axios.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(content)
  });
}

export default async () => {
  const messages = {
    sign: "",
    draw: "",
    dip: ""
  }

  // 处理签到
  try {
    const signRes = await checkIn()
    const signMsg = signRes.err_msg || ""
    messages.sign = signMsg == "success" ? "签到成功(现有钻石："+((signRes.data || {}).sum_point || 0)+")" : "签到失败("+signMsg+")"
  } catch(_) {messages.sign = "请求出错"}

  // 处理抽奖
  try {
    const drawRes = await draw()
    const drawMsg = drawRes.err_msg || ""
    messages.draw = drawMsg == "success" ? "抽奖成功(当前幸运值："+((drawRes.data || {}).total_lucky_value || 0)+")" : drawMsg
  } catch(_) {messages.sign = "请求出错"}

  // 处理沾福气
  try {
    const dipRes = await dip()
    const dipMsg = dipRes.err_msg || ""
    messages.dip = dipMsg == "success" ? "沾喜成功(当前幸运值："+((dipRes.data || {}).total_value || 0)+")" : dipMsg
  } catch(_) {messages.sign = "请求出错"}

  // 钉钉机器人消息
  console.log((await robotNotice({
    msgtype: 'text',
    text: {
      content: messages.sign + "\n" + messages.draw + "\n" + messages.dip
    },
    at: {}
  })).data || {})
}
