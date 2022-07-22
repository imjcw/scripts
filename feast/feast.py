# -*- coding: utf-8 -*-
import json
import time
import urllib
import requests
from datetime import datetime, timedelta
from pytz import timezone
import hmac
import base64
from hashlib import sha256
import os

try:
	quote_plus = urllib.parse.quote_plus
except AttributeError:
	quote_plus = urllib.quote_plus

def initCalendar(now):
	year = now.strftime('%Y')
	handler = open("files/calendar/" + year + ".json", 'r')
	c = handler.read()
	handler.close()
	return json.loads(c)

def notice(now):
	date = now.strftime('%Y-%m-%d')
	if date in calendar['holidays']:
		raise Exception('节假日，无需通知')
	secret = 'SECb7c7a0492d357feef2bc303f8598a6cdeeb884be198f7d76092afb281addb6a5'
	timestamp = int(round(time.time() * 1000))
	secret_enc = bytes(secret).encode('utf-8')
	string_to_sign = '{}\n{}'.format(timestamp, secret)
	string_to_sign_enc = bytes(string_to_sign, encoding='utf-8')
	hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=sha256).digest()
	token = os.environ['FEAST_TOKEN']
	secret = os.environ['FEAST_SECRET']
	sign = quote_plus(base64.b64encode(hmac_code))
	webhook = 'https://oapi.dingtalk.com/robot/send?access_token=2a02a70c0a0b317efa35ff68c5288f7565033ef4ae672ffa981a41c4d5f9754a'
	webhook = '{}&timestamp={}&sign={}'.format(webhook, str(timestamp), sign)
	data = {"msgtype": "text", "text": {"content": "干饭人，干饭魂，该点饭了"}}
	try:
		post_data = json.dumps(data)
		response = requests.post(webhook, headers={'Content-Type': 'application/json; charset=utf-8'}, data=post_data)
	except requests.exceptions.HTTPError as exc:
		raise Exception("消息发送失败， HTTP error: %d, reason: %s" % (exc.response.status_code, exc.response.reason))
	except requests.exceptions.ConnectionError:
		raise Exception("消息发送失败，HTTP connection error!")
	except requests.exceptions.Timeout:
		raise Exception("消息发送失败，Timeout error!")
	except requests.exceptions.RequestException:
		raise Exception("消息发送失败, Request Exception!")
	else:
		try:
			result = response.json()
		except JSONDecodeError:
			raise Exception("服务器响应异常，状态码：%s，响应内容：%s" % (response.status_code, response.text))


try:
	tz_utc_8 = timezone('Asia/Shanghai')
	now = datetime.utcnow().replace(tzinfo=tz_utc_8)
	calendar = initCalendar(now)
	notice(now)
except Exception as e:
	print(e)
