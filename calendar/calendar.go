package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

func main() {
	time.LoadLocation("Asia/Shanghai")
	genNewYearFile()
}

func checkPageChange() {
	year := time.Now().Local().Year()
	defer func() {
		if r := recover(); r != nil {
			fmt.Println(r)
		}
	}()
	getHolidaysAndWeekdays(year)
}

func genNewYearFile() {
	year := time.Now().Local().AddDate(1, 0, 0).Year()
	if time.Now().Local().Month() < 10 {
		fmt.Println("未到10月份，暂不执行")
		return
	}
	if fileExists("files/calendar/" + strconv.Itoa(year) + "-holidays.json") {
		return
	}
	defer func() {
		if r := recover(); r != nil {
			fmt.Println(r)
		}
	}()
	holidays, workdays := getHolidaysAndWeekdays(year)
	genDailyFile(year, holidays, workdays)
}

func getHolidaysAndWeekdays(year int) ([]string, []string) {
	searchLink, err := getLink(strconv.Itoa(year))
	if err != nil {
		panic(err)
	}
	// 搜索获取信息
	content, err := getPage(searchLink)
	if err != nil {
		panic(err)
	}
	pageLink := parsePageLink(content)
	if pageLink == "" {
		panic(errors.New("未搜索到相关内容"))
	}
	// 搜索获取信息
	content, err = getPage(pageLink)
	if err != nil {
		panic(err)
	}
	holidays, workdays, err := parsePageDate(content, strconv.Itoa(year))
	if err != nil {
		panic(err)
	}
	if len(holidays) == 0 || len(workdays) == 0 {
		panic(errors.New("未获取到节假日相关信息"))
	}
	return holidays, workdays
}

func getLink(year string) (string, error) {
	URL, err := url.Parse("http://sousuo.gov.cn/s.htm")
	if err != nil {
		return "", err
	}
	params := url.Values{}
	params.Set("t", "paper")
	params.Set("advance", "false")
	params.Set("n", "10")
	params.Set("timetype", "timezd")
	params.Set("mintime", year+"-01-01")
	params.Set("maxtime", year+"-12-31")
	params.Set("sort", "pubtime")
	params.Set("q", "部分节假日安排的通知")
	URL.RawQuery = params.Encode()
	return URL.String(), nil
}

func getPage(link string) (string, error) {
	resp, err := http.Get(link)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	html, err := ioutil.ReadAll(resp.Body)
	return string(html), err
}

func parsePageLink(content string) string {
	list := regexp.MustCompile("<.*res-sub-title(.*)").FindString(content)
	return regexp.MustCompile(`(https?|ftp|file)://[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]`).FindString(list)
}

func parsePageDate(content string, year string) ([]string, []string, error) {
	holidays := []string{}
	workdays := []string{}
	data := regexp.MustCompile(`<td[^>]*id=['"]UCAP-CONTENT['"][^>]*>([\s\S]*?)<\/td>`).FindString(content)
	lines := strings.Split(data, "\r\n")
	datePreg := regexp.MustCompile(`(\d+月\d+日)|(\d+日)`)
	for _, line := range lines {
		if strings.Index(line, "日放假") == -1 {
			continue
		}
		items := strings.Split(line, "放假")
		holidayList := datePreg.FindAllString(items[0], -1)
		beginDate := fullDay(year, holidayList[0])
		endDate := ""
		if len(holidayList) > 1 && strings.Index(holidayList[1], "月") == -1 {
			holidayList[1] = strings.Split(beginDate, "-")[1] + "月" + holidayList[1]
			endDate = fullDay(year, holidayList[1])
		}
		holidays = append(holidays, fillDayRange(beginDate, endDate)...)
		if len(items) > 1 {
			for _, item := range datePreg.FindAllString(items[1], -1) {
				workdays = append(workdays, fullDay(year, item))
			}
		}
	}
	return holidays, workdays, nil
}

func fullDay(year, date string) string {
	date = strings.ReplaceAll(strings.ReplaceAll(date, "月", "-"), "日", "")
	items := strings.Split(date, "-")
	if len(items[0]) == 1 {
		items[0] = "0" + items[0]
	}
	if len(items[1]) == 1 {
		items[1] = "0" + items[1]
	}
	return year + "-" + strings.Join(items, "-")
}

func fillDayRange(startDate, endDate string) []string {
	dateRange := []string{startDate}
	if endDate == "" {
		return dateRange
	}
	date := startDate
	t, _ := time.Parse("2006-01-02", startDate)
	for date != endDate {
		t = t.Add(time.Hour * 24)
		date = t.Format("2006-01-02")
		dateRange = append(dateRange, date)
	}
	return dateRange
}

func genDailyFile(year int, holidays, workdays []string) {
	firstDay := strconv.Itoa(year) + "-01-01"
	t, _ := time.Parse("2006-01-02", firstDay)
	fullHolidays := []string{}
	fullDays := []map[string]interface{}{}
	for t.Local().Year() == year {
		day := t.Local().Format("2006-01-02")
		weekday := t.Local().Weekday().String()
		dayInfo := map[string]interface{}{
			"day":     day,
			"weekday": weekday,
			"holiday": false,
		}
		t = t.Local().Add(time.Hour * 24)
		if inArray(day, holidays) {
			fullHolidays = append(fullHolidays, day)
			dayInfo["holiday"] = true
			fullDays = append(fullDays, dayInfo)
			continue
		}
		if weekday != "Saturday" && weekday != "Sunday" {
			fullDays = append(fullDays, dayInfo)
			continue
		}
		if inArray(day, workdays) {
			fullDays = append(fullDays, dayInfo)
			continue
		}
		dayInfo["holiday"] = true
		fullDays = append(fullDays, dayInfo)
		fullHolidays = append(fullHolidays, day)
	}
	data, _ := json.Marshal(map[string]interface{}{
		"days":     fullDays,
		"holidays": fullHolidays,
		"workdays": workdays,
	})
	holidayData, _:= json.Marshal(map[string]interface{}{
		"holidays": fullHolidays,
	})
	if err := ioutil.WriteFile("files/calendar/"+strconv.Itoa(year)+".json", data, 0644); err != nil {
		panic(err)
	}
	if err := ioutil.WriteFile("files/calendar/"+strconv.Itoa(year)+"-holidays.json", holidayData, 0644); err != nil {
		panic(err)
	}
}

func fileExists(filePath string) bool {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return false
	}
	return true
}

func inArray(needle string, haystack []string) bool {
	for _, v := range haystack {
		if v == needle {
			return true
		}
	}
	return false
}
