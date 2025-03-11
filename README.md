
# **Setting Up Go WebSocket Server and Next.js Client**

## **1. Set Up Go WebSocket Server**  

### **Initialize Go Module**  
```sh
go mod init RTapp
```

### **Install Dependencies**  
```sh
go get github.com/gorilla/websocket
```

### **Create WebSocket Server (Go)**  
Create a `main.go` file and paste the following code:  

```go
package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow any origin
}

type WebSocketHub struct {
	clients   map[*websocket.Conn]bool
	broadcast chan []byte
	mutex     sync.Mutex
}

func newHub() *WebSocketHub {
	return &WebSocketHub{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan []byte),
	}
}

func (h *WebSocketHub) run() {
	for {
		message := <-h.broadcast
		h.mutex.Lock()
		for client := range h.clients {
			err := client.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				client.Close()
				delete(h.clients, client)
			}
		}
		h.mutex.Unlock()
	}
}

func (h *WebSocketHub) handleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}

	h.mutex.Lock()
	h.clients[conn] = true
	h.mutex.Unlock()

	defer func() {
		h.mutex.Lock()
		delete(h.clients, conn)
		h.mutex.Unlock()
		conn.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		h.broadcast <- msg
	}
}

func main() {
	hub := newHub()
	go hub.run()

	http.HandleFunc("/ws", hub.handleConnection)

	port := "8080"
	fmt.Println("WebSocket server listening on port", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

### **Run the WebSocket Server**  
```sh
go run main.go
```

---

## **2. Set Up Next.js Frontend**  

### **Create Next.js App**  
```sh
npx create-next-app@latest
```
- **Project Name:** `rt-app`  
- **Use TypeScript?** `Yes`  
- **Use ESLint?** `Yes`  
- **Use Tailwind CSS?** `Yes`  
- **Use `src/` directory?** `Yes`  
- **Use App Router?** `Yes`  
- **Use Turbopack?** `Yes`  
- **Customize import alias (`@/*`)?** `No`  

### **Update Dependencies**  
```sh
npm update
```

### **Start Development Server**  
```sh
npm run dev
```

---

## **3. Implement WebSocket Client in Next.js**  

Create a new page component (`src/app/page.tsx`) and paste the following code:  

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function WebSocketPage() {
  const [messages, setMessages] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/ws") // Change to your actual server URL

    socketRef.current = socket

    socket.addEventListener("open", () => {
      setConnectionStatus("connected")
      setError(null)
    })

    socket.addEventListener("message", (event) => {
      setMessages((prevMessages) => [...prevMessages, event.data])
    })

    socket.addEventListener("error", () => {
      setConnectionStatus("disconnected")
      setError("WebSocket connection error")
    })

    socket.addEventListener("close", () => {
      setConnectionStatus("disconnected")
    })

    return () => {
      socket.close()
    }
  }, [])

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>WebSocket Messages</CardTitle>
            <ConnectionStatus status={connectionStatus} />
          </div>
          <CardDescription>Real-time messages from WebSocket connection</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          <div className="border rounded-md p-4 h-[300px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No messages received yet</p>
            ) : (
              <ul className="space-y-2">
                {messages.map((message, index) => (
                  <li key={index} className="p-2 bg-muted rounded-md">{message}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <SendMessageForm
              onSendMessage={(message) => {
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                  socketRef.current.send(message)
                }
              }}
              isConnected={connectionStatus === "connected"}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ConnectionStatus({ status }: { status: "connecting" | "connected" | "disconnected" }) {
  return (
    <div className="flex items-center gap-2">
      {status === "connected" ? (
        <>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="text-xs text-green-500">Connected</span>
        </>
      ) : status === "connecting" ? (
        <>
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
          <span className="text-xs text-yellow-500">Connecting...</span>
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-red-500"></div>
          <span className="text-xs text-red-500">Disconnected</span>
        </>
      )}
    </div>
  )
}

function SendMessageForm({ onSendMessage, isConnected }: { onSendMessage: (message: string) => void, isConnected: boolean }) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && isConnected) {
      onSendMessage(message)
      setMessage("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none"
        disabled={!isConnected}
      />
      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded-md disabled:opacity-50"
        disabled={!message.trim() || !isConnected}
      >
        Send
      </button>
    </form>
  )
}
```

---

## **4. Install UI Components**  

```sh
npx shadcn@latest init --force
npm install lucide-react
npx shadcn@latest add card
```

---

Now, both your **Go WebSocket server** and **Next.js client** are ready! 🚀