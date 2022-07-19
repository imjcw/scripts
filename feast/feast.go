package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"
)

type day struct {
	Day     string `json:"day"`
	Holiday bool   `json:"holiday"`
	Weekday string `json:"weekday"`
}

type calendar struct {
	Days     []day    `json:"days"`
	Holidays []string `json:"holidays"`
	Workdays []string `json:"workdays"`
}

func main() {
	time.LoadLocation("Asia/Shanghai")
	year := time.Now().Local().Year()
	content, err := ioutil.ReadFile("files/calendar/" + strconv.Itoa(year) + ".json")
	if err != nil {
		panic(err)
	}
	c := &calendar{}
	if err := json.Unmarshal(content, c); err != nil {
		panic(err)
	}
	day := time.Now().Local().Format("2006-01-02")
	if inArray(day, c.Holidays) {
		panic("节假日，无需通知")
	}
	timestamp := fmt.Sprintf("%v", time.Now().Local().Unix()*1000)
	token, _ := os.LookupEnv("FEAST_TOKEN")
	secret, _ := os.LookupEnv("FEAST_SECRET")
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(timestamp + "\n" + secret))
	sign := url.QueryEscape(base64.StdEncoding.EncodeToString(h.Sum(nil)))
	_, err = http.Post("https://oapi.dingtalk.com/robot/send?access_token="+token+"&timestamp="+timestamp+"&sign="+sign, "application/json", bytes.NewBufferString(`{"msgtype": "text", "text": {"content": "干饭人，干饭魂，该点饭了"}}`))
	if err != nil {
		panic(err)
	}
}

func inArray(needle string, haystack []string) bool {
	for _, v := range haystack {
		if v == needle {
			return true
		}
	}
	return false
}
