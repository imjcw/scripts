package main

import (
	"os"
	"strings"
)

func main(){
	envs := os.Environ()
	for _, e := range envs {
		parts := strings.SplitN(e, "=", 2)
		if len(parts) != 2 {
			continue
		}else{
			println(string(parts[0]),string(parts[1]))
		}
	}
}
