"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, Globe, Play, Square, Clock, CheckCircle, XCircle, Loader2, Plus, MessageSquare } from "lucide-react";

type TaskStatus = "pending" | "running" | "completed" | "failed";

interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "action" | "result" | "error";
  message: string;
}

interface Task {
  id: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  createdAt: Date;
  logs: LogEntry[];
  result?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  taskId?: string;
}

const MOCK_STEPS = [
  { type: "info" as const, message: "Initializing browser agent..." },
  { type: "action" as const, message: "Navigating to target URL..." },
  { type: "result" as const, message: "Page loaded successfully. Extracting content..." },
  { type: "action" as const, message: "Clicking relevant links and scrolling..." },
  { type: "result" as const, message: "Gathered key information from 3 pages." },
  { type: "info" as const, message: "Summarizing findings..." },
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your autonomous browsing agent assistant. Describe a web research or browsing task, and I'll run an agent to complete it while you monitor the progress.",
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tasks, selectedTaskId]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const startAgentTask = (prompt: string) => {
    const taskId = `task-${Date.now()}`;
    const newTask: Task = {
      id: taskId,
      title: prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""),
      prompt,
      status: "running",
      createdAt: new Date(),
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          type: "info",
          message: `Task started: "${prompt}"`,
        },
      ],
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(taskId);

    setMessages((prev) => [
      ...prev,
      { id: `msg-user-${Date.now()}`, role: "user", content: prompt },
      {
        id: `msg-asst-${Date.now()}`,
        role: "assistant",
        content: `Starting autonomous browsing agent for your task. You can monitor progress in the panel on the right.`,
        taskId,
      },
    ]);

    // Simulate agent steps
    let step = 0;
    const interval = setInterval(() => {
      if (step >= MOCK_STEPS.length) {
        clearInterval(interval);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "completed",
                  result: `Successfully completed the browsing task.\n\nSummary of findings based on your request: "${prompt}"\n\n• Key pages visited and analyzed.\n• Relevant data extracted.\n• Task finished without errors.`,
                  logs: [
                    ...t.logs,
                    {
                      id: `log-final-${Date.now()}`,
                      timestamp: new Date(),
                      type: "result",
                      message: "Agent finished successfully.",
                    },
                  ],
                }
              : t
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-done-${Date.now()}`,
            role: "assistant",
            content: `✅ Task completed! Check the monitoring panel for full logs and the summary result.`,
            taskId,
          },
        ]);
        return;
      }

      const currentStep = MOCK_STEPS[step];
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                logs: [
                  ...t.logs,
                  {
                    id: `log-${Date.now()}-${step}`,
                    timestamp: new Date(),
                    type: currentStep.type,
                    message: currentStep.message,
                  },
                ],
              }
            : t
        )
      );
      step++;
    }, 1800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    startAgentTask(input.trim());
    setInput("");
  };

  const statusIcon = (status: TaskStatus) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "w-64" : "w-0"
        } bg-[#171717] border-r border-gray-800 flex flex-col transition-all overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={() => {
              setSelectedTaskId(null);
              setMessages([
                {
                  id: "welcome",
                  role: "assistant",
                  content:
                    "Hello! I'm your autonomous browsing agent assistant. Describe a web research or browsing task, and I'll run an agent to complete it while you monitor the progress.",
                },
              ]);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-gray-500 px-2 py-1 uppercase tracking-wider">Recent tasks</div>
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-start gap-2 hover:bg-gray-800 transition ${
                selectedTaskId === task.id ? "bg-gray-800" : ""
              }`}
            >
              {statusIcon(task.status)}
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{task.title}</div>
                <div className="text-xs text-gray-500">{task.createdAt.toLocaleTimeString()}</div>
              </div>
            </button>
          ))}
          {tasks.length === 0 && (
            <div className="text-sm text-gray-500 px-3 py-4">No tasks yet</div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-800 flex items-center px-4 gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">Agent Browser</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-[#1e1e1e] border border-gray-800"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
          <div className="max-w-3xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe a browsing task (e.g. Research latest AI news on TechCrunch)..."
              className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Agents run autonomously. Monitor live logs in the side panel.
          </p>
        </form>
      </div>

      {/* Monitoring panel */}
      <div className="w-96 border-l border-gray-800 bg-[#141414] flex flex-col">
        <div className="h-14 border-b border-gray-800 flex items-center px-4 gap-2">
          <Play className="w-4 h-4 text-green-400" />
          <span className="font-medium text-sm">Task Monitor</span>
        </div>

        {selectedTask ? (
          <>
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                {statusIcon(selectedTask.status)}
                <span className="text-sm font-medium capitalize">{selectedTask.status}</span>
              </div>
              <p className="text-sm text-gray-300">{selectedTask.prompt}</p>
              <p className="text-xs text-gray-500 mt-1">
                Started {selectedTask.createdAt.toLocaleString()}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Live logs</div>
              {selectedTask.logs.map((log) => (
                <div key={log.id} className="text-xs">
                  <div className="flex items-center gap-2 text-gray-500 mb-0.5">
                    <span>{log.timestamp.toLocaleTimeString()}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                        log.type === "action"
                          ? "bg-blue-900/50 text-blue-300"
                          : log.type === "result"
                          ? "bg-green-900/50 text-green-300"
                          : log.type === "error"
                          ? "bg-red-900/50 text-red-300"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {log.type}
                    </span>
                  </div>
                  <p className="text-gray-300">{log.message}</p>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {selectedTask.result && (
              <div className="p-4 border-t border-gray-800 bg-[#1a1a1a]">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Result</div>
                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans">
                  {selectedTask.result}
                </pre>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8 text-center">
            <div>
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Select a task or start a new one to monitor agent progress here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}