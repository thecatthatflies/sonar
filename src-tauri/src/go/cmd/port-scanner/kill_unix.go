//go:build !windows

package main

import "syscall"

func killProcess(pid int) error {
	return syscall.Kill(pid, syscall.SIGTERM)
}
