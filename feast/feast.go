package main

import (
	"os"
)

func main(){
	println(os.LookupEnv("FEAST_TOKEN"))
}
