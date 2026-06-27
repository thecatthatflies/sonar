//go:build windows

package main

import (
	"os/exec"
	"strconv"
)

func killProcess(pid int) error {
	return exec.Command("taskkill", "/PID", strconv.Itoa(pid), "/F").Run()
}
