"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, FileText, Upload, AlertCircle } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
// Set worker source
GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface FileUpload {
  id: string;
  name: string;
  content?: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<FileUpload | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pdfContent, setPdfContent] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, uploadedFile, uploadError]);

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
      setUploadedFile({ id: crypto.randomUUID(), name: file.name });
      const reader = new FileReader();

      reader.onload = async function (event) {
        try {
          if (!event.target?.result) throw new Error("Failed to read file");
          const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
          const pdf = await getDocument({ data: typedArray }).promise;
          let text = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
          }

          setPdfContent(text);
          setUploadedFile({ id: crypto.randomUUID(), name: file.name, content: text });
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: "ai", text: `PDF \"${file.name}\" processed successfully!`, timestamp: new Date() }]);
        } catch (error) {
          console.error("Error parsing PDF:", error);
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
    } catch (error) {
      console.error("Error handling file upload:", error);
      setUploadError("An unexpected error occurred. Please try again.");
      setPdfProcessing(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: "user", text: input, timestamp: new Date() }]);
    setInput("");
    setIsTyping(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, pdfText: pdfContent }),
    });
    const data = await response.json();

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: "ai", text: data.reply || "No response.", timestamp: new Date() }]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 bg-gradient-to-b from-blue-500 to-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-4 text-white">PDF-Powered Chatbot</h1>
      <Card className="flex-1 flex flex-col border rounded-lg shadow-md bg-white">
        <CardContent className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-250px)] border rounded-md">
            <div className="flex flex-col gap-4 p-4" ref={scrollRef}>
              {messages.map((msg) => (
                <div key={msg.id} className={`p-3 rounded-xl ${msg.sender === "user" ? "bg-blue-100 text-blue-800 self-end" : "bg-gray-100 text-gray-800 self-start"}`}>{msg.text}</div>
              ))}
              {uploadError && <div className="p-3 rounded-xl bg-red-100 text-red-800 self-start flex items-center gap-2"><AlertCircle className="w-5 h-5" /> <span>{uploadError}</span></div>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <div className="mt-4 flex flex-col gap-2">
        <Button onClick={() => fileInputRef.current?.click()} disabled={pdfProcessing} className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center gap-2 transition-colors">
          {pdfProcessing ? <><div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> Processing...</> : <><Upload className="w-5 h-5" /> Upload PDF</>}
        </Button>
        <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        <div className="flex gap-2 mt-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask something..." className="flex-1" />
          <Button onClick={handleSendMessage} disabled={isTyping} className="bg-blue-600 text-white"><Send className="w-5 h-5" /></Button>
        </div>
      </div>
    </div>
  );
}
