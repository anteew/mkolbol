package main

import (
    "encoding/json"
    "flag"
    "fmt"
    "net"
    "net/url"
    "os"
    "strings"
    "time"
)

type Beacon struct {
    HostId   string   `json:"hostId"`
    Addr     string   `json:"addr"`
    Proto    string   `json:"proto"`
    Versions []string `json:"versions"`
    Caps     []string `json:"caps"`
    TTL      int      `json:"ttl"`
}

func sendBeaconLoop(target string, b Beacon) {
    // target: host:port (udp)
    raddr, err := net.ResolveUDPAddr("udp4", target)
    if err != nil {
        fmt.Println("beacon resolve error:", err)
        return
    }
    conn, err := net.DialUDP("udp4", nil, raddr)
    if err != nil {
        fmt.Println("beacon dial error:", err)
        return
    }
    defer conn.Close()
    enc, _ := json.Marshal(b)
    t := time.NewTicker(3 * time.Second)
    for {
        _, _ = conn.Write(enc)
        <-t.C
    }
}

func runTCP(port string) {
    ln, err := net.Listen("tcp", ":"+port)
    if err != nil {
        panic(err)
    }
    fmt.Println("[go-beachhead] listening on tcp:", port)
    for {
        c, err := ln.Accept()
        if err != nil { continue }
        go func(conn net.Conn) {
            defer conn.Close()
            buf := make([]byte, 4096)
            for {
                n, err := conn.Read(buf)
                if err != nil { return }
                data := buf[:n]
                // If ping, respond pong; else echo
                if strings.HasPrefix(string(data), "PING") {
                    conn.Write([]byte("PONG\n"))
                } else {
                    conn.Write(data)
                }
            }
        }(c)
    }
}

func main() {
    port := getenv("PORT", "30018")
    disc := getenv("DISCOVERY_TARGET", "host.docker.internal:53530")
    hostId := getenv("HOST_ID", hostname())

    // Start TCP server
    go runTCP(port)

    // Send beacon
    addr := fmt.Sprintf("tcp://%s:%s", getenv("PUBLIC_HOST","beachhead"), port)
    u, _ := url.Parse(addr)
    proto := u.Scheme
    b := Beacon{HostId: hostId, Addr: addr, Proto: proto, Versions: []string{"v1"}, Caps: []string{"echo"}, TTL: 8000}
    go sendBeaconLoop(disc, b)

    fmt.Println("[go-beachhead] sending beacons to", disc, "every 3s")
    select {}
}

func getenv(k, d string) string {
    v := os.Getenv(k)
    if v == "" { return d }
    return v
}

func hostname() string {
    h, err := os.Hostname()
    if err != nil { return "go-beachhead" }
    return h
}

