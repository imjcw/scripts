/**
 * 钉钉机器人签名服务
*/
const crypto = require('crypto');

// 钉钉签名
const dingtalkSign = (secret, content) => {
  const str = crypto.createHmac('sha256', secret).update(content)
    .digest()
    .toString('base64');
  return encodeURIComponent(str);
}

/**
 * Dingtalk robot sign function
 * 
 * @param {NapkinRequest} req
 * @param {NapkinResponse} res
*/
export default async (req, res) => {
  const secret = req.query.secret || ""
  const token = req.query.token || ""
  let signStr = '';
  if (secret) {
    const timestamp = Date.now();
    signStr = '&timestamp=' + timestamp + '&sign=' + dingtalkSign(secret, timestamp + '\n' + secret);
  }
  res.set('content-type', `application/json`)
  res.json({
    url: `https://oapi.dingtalk.com/robot/send?access_token=` + token + signStr
  })
}
