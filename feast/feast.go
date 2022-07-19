package main

import (
	"os"
	"strings"
)

func main(){
	println(os.LookupEnv("FEAST_TOKEN"))
}
