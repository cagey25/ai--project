"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pdfContent, setPdfContent] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the bottom when messages or errors change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, uploadError, isTyping]);

  // Handle PDF file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError(null);

    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF file.");
      return;
    }

    try {
      setPdfProcessing(true);
      const reader = new FileReader();

      reader.onload = async function (event) {
        try {
          if (!event.target?.result) throw new Error("Failed to read file");
          const pdfBuffer = event.target.result as ArrayBuffer;

          const response = await fetch("/api/parse-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfBuffer: Array.from(new Uint8Array(pdfBuffer)) }),
          });

          if (!response.ok) {
            throw new Error("Failed to parse PDF");
          }

          const data = await response.json();
          setPdfContent(data.text);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: "ai",
              text: `PDF "${file.name}" processed successfully!`,
              timestamp: new Date(),
            },
          ]);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          console.error("Error parsing PDF:", errorMessage);
          setUploadError("Failed to parse the PDF. The file might be corrupted or password-protected.");
        } finally {
          setPdfProcessing(false);
        }
      };
      reader.onerror = () => {
        setUploadError("Error reading the file. Please try again.");
        setPdfProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Error handling file upload:", errorMessage);
      setUploadError("An unexpected error occurred. Please try again.");
      setPdfProcessing(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle sending a message and calling the API
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const conversationHistory = [
        ...messages.map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        })),
        {
          role: "user",
          parts: [{ text: input }],
        },
      ];

      if (pdfContent) {
        conversationHistory.unshift({
          role: "user",
          parts: [{ text: `Here is the content of the uploaded PDF:\n${pdfContent}` }],
        });
      }

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCQPdR0iv9C3tM3UprDG8YVSSvHTAkjy28",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: conversationHistory,
            generation_config: {
              temperature: 0.7,
              top_p: 0.95,
              top_k: 40,
              max_output_tokens: 8192,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts) {
        const aiResponseText = data.candidates[0].content.parts[0].text;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "ai",
            text: aiResponseText,
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error("Invalid API response");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while fetching the response";
      console.error("Error calling the API:", errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: "An error occurred while fetching the response. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 bg-gradient-to-b from-blue-500 to-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-4 text-white">PDF-Powered Chatbot</h1>
      <Card className="flex-1 flex flex-col border rounded-lg shadow-md bg-white">
        <CardContent className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-250px)] border rounded-md">
            <div className="flex flex-col gap-4 p-4" ref={scrollRef}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl ${
                    msg.sender === "user" ? "bg-blue-100 text-blue-800 self-end" : "bg-gray-100 text-gray-800 self-start"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {uploadError && (
                <div className="p-3 rounded-xl bg-red-100 text-red-800 self-start flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>{uploadError}</span>
                </div>
              )}
              {isTyping && (
                <div className="p-3 rounded-xl bg-gray-100 text-gray-800 self-start flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-t-transparent border-gray-800 rounded-full animate-spin"></div>
                  <span>Typing...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={pdfProcessing}
          className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center gap-2 transition-colors"
        >
          {pdfProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload PDF
            </>
          )}
        </Button>
        <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        <div className="flex gap-2 mt-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isTyping} className="bg-blue-600 text-white">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}