"use client"

import type React from "react"
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

    socket.addEventListener("error", (event) => {
      setConnectionStatus("disconnected")
      setError("WebSocket connection error")
      console.error("WebSocket error:", event)
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
                  <li key={index} className="p-2 bg-muted rounded-md">
                    {message}
                  </li>
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

function SendMessageForm({
  onSendMessage,
  isConnected,
}: {
  onSendMessage: (message: string) => void
  isConnected: boolean
}) {
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
        placeholder="Type a message to send..."
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!isConnected}
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        disabled={!message.trim() || !isConnected}
      >
        Send
      </button>
    </form>
  )
}
