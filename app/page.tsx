"use client";

import { useEffect, useRef, useState } from "react";

type Order = {
  id: string;
  customer: string;
  product: string;
  amount: string;
  status: string;
  courier: string;
  tracking: string;
  delivery: string;
};

type Message = {
  speaker: "Aria" | "Customer";
  text: string;
};

type ResponseData = {
  response: string;
  orderId: string | null;
  intent: string;
  resolution: string;
};

/* =========================================================
   MOCK ORDERS
========================================================= */

const orders: Order[] = [
  {
    id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    amount: "₹699",
    status: "Out for Delivery",
    courier: "BlueDart",
    tracking: "BD-982103",
    delivery: "Expected by 6 PM today",
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    amount: "₹499",
    status: "Delivered",
    courier: "Delhivery",
    tracking: "DL-441029",
    delivery: "Delivered 14 days ago",
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    amount: "₹850",
    status: "Processing",
    courier: "—",
    tracking: "—",
    delivery: "Ordered 3 hours ago • Cancellation eligible",
  },
];

/* =========================================================
   AURA POLICIES
========================================================= */

const policies = {
  shipping:
    "Aura offers free shipping on orders above ₹499. Orders below ₹499 have a ₹50 shipping fee. Standard delivery takes 3 to 5 business days.",

  returns:
    "Aura accepts returns within 7 days of delivery. The product must be unopened, unused, and in its original packaging.",

  damaged:
    "Damaged or defective products must be reported within 48 hours with photos for replacement.",

  cancellation:
    "Cancellation is possible only while an order is Processing. Once shipped or Out for Delivery, the order cannot be cancelled. The customer may refuse delivery.",

  cod:
    "Cash on Delivery is available for orders up to ₹2,500. Customers can pay by cash or UPI at the doorstep.",
};

/* =========================================================
   ORDER LOOKUP TOOL
========================================================= */

function getOrderDetails(orderId: string): Order | null {
  const normalizedId = orderId
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  const order = orders.find(
    (item) =>
      item.id
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/-/g, "") === normalizedId
  );

  return order || null;
}

/* =========================================================
   ORDER ID EXTRACTION
========================================================= */

function extractOrderId(text: string): string | null {
  let normalized = text
    .toUpperCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /*
    Convert common speech-recognition variations:

    OR D 101
    O R D 101
    ORDER NUMBER 101
    ORDER NO 101
    ORDER 101
  */

  normalized = normalized
    .replace(/\bO\s+R\s+D\b/g, "ORD")
    .replace(/\bOR\s+D\b/g, "ORD")
    .replace(/\bORDER\s+NUMBER\b/g, "ORD")
    .replace(/\bORDER\s+NO\b/g, "ORD")
    .replace(/\bORDER\s+ID\b/g, "ORD")
    .replace(/\bORDER\b/g, "ORD");

  /*
    ORD-101
    ORD 101
    ORD101
  */

  const directMatch = normalized.match(/\bORD[-\s]?(\d{3})\b/);

  if (directMatch) {
    return `ORD-${directMatch[1]}`;
  }

  /*
    Handle speech recognition saying:

    ORD one zero one
    ORD one zero two
    ORD one zero three
  */

  const numberWords: Record<string, string> = {
    ZERO: "0",
    ONE: "1",
    TWO: "2",
    THREE: "3",
    FOUR: "4",
    FIVE: "5",
    SIX: "6",
    SEVEN: "7",
    EIGHT: "8",
    NINE: "9",
  };

  const words = normalized.split(" ");

  const ordIndex = words.indexOf("ORD");

  if (ordIndex !== -1 && ordIndex + 3 < words.length) {
    const possibleDigits = words.slice(ordIndex + 1, ordIndex + 4);

    if (
      possibleDigits.length === 3 &&
      possibleDigits.every((word) => numberWords[word])
    ) {
      const digits = possibleDigits
        .map((word) => numberWords[word])
        .join("");

      return `ORD-${digits}`;
    }
  }

  return null;
}

/* =========================================================
   RESPONSE ENGINE
========================================================= */

function generateResponse(userText: string): ResponseData {
  const text = userText.toLowerCase().trim();

  const orderId = extractOrderId(userText);

  /* -------------------------------------------------------
     OUT OF SCOPE
  ------------------------------------------------------- */

  if (
    text.includes("flight") ||
    text.includes("hotel") ||
    text.includes("train ticket") ||
    text.includes("movie ticket") ||
    text.includes("restaurant booking") ||
    text.includes("book a flight")
  ) {
    return {
      response:
        "I'm sorry, but I can only help with Aura Skincare orders, shipping, returns, cancellations, damaged products, and payment questions.",
      orderId,
      intent: "OUT_OF_SCOPE",
      resolution: "RESOLVED",
    };
  }

  /* -------------------------------------------------------
     RETURN / REFUND
  ------------------------------------------------------- */

  if (
    text.includes("return") ||
    text.includes("refund") ||
    text.includes("money back")
  ) {
    if (!orderId) {
      return {
        response:
          "Sure, I can check the return eligibility. Please tell me your order number, for example ORD-102.",
        orderId: null,
        intent: "RETURN_REQUEST",
        resolution: "WAITING_FOR_ORDER_ID",
      };
    }

    const order = getOrderDetails(orderId);

    if (!order) {
      return {
        response: `I couldn't find ${orderId}. Please check the order number and tell me again.`,
        orderId,
        intent: "RETURN_REQUEST",
        resolution: "ORDER_NOT_FOUND",
      };
    }

    /*
      ORD-102:
      Delivered 14 days ago.
      Return policy: 7 days.
    */

    if (orderId === "ORD-102") {
      return {
        response:
          "I checked ORD-102. It was delivered 14 days ago, so it is outside Aura's 7-day return window. I cannot promise a refund for this order under the standard return policy.",
        orderId,
        intent: "RETURN_REQUEST",
        resolution: "NOT_ELIGIBLE",
      };
    }

    return {
      response:
        "Aura accepts returns within 7 days of delivery, provided the product is unopened, unused, and in its original packaging.",
      orderId,
      intent: "RETURN_REQUEST",
      resolution: "POLICY_PROVIDED",
    };
  }

  /* -------------------------------------------------------
     CANCELLATION
  ------------------------------------------------------- */

  if (
    text.includes("cancel") ||
    text.includes("cancellation")
  ) {
    if (!orderId) {
      return {
        response:
          "Sure, I can check cancellation eligibility. Please tell me your order number, for example ORD-103.",
        orderId: null,
        intent: "CANCELLATION",
        resolution: "WAITING_FOR_ORDER_ID",
      };
    }

    const order = getOrderDetails(orderId);

    if (!order) {
      return {
        response: `I couldn't find ${orderId}. Please check the order number and tell me again.`,
        orderId,
        intent: "CANCELLATION",
        resolution: "ORDER_NOT_FOUND",
      };
    }

    if (order.status === "Processing") {
      return {
        response:
          `${orderId} is currently Processing, so it is eligible for cancellation.`,
        orderId,
        intent: "CANCELLATION",
        resolution: "ELIGIBLE",
      };
    }

    return {
      response:
        `${orderId} is currently ${order.status}. Aura only allows cancellation while an order is Processing. Since this order has already moved forward, cancellation is not available. You may refuse delivery if it arrives.`,
      orderId,
      intent: "CANCELLATION",
      resolution: "NOT_ELIGIBLE",
    };
  }

  /* -------------------------------------------------------
     DAMAGED / DEFECTIVE
  ------------------------------------------------------- */

  if (
    text.includes("damaged") ||
    text.includes("defective") ||
    text.includes("broken")
  ) {
    return {
      response:
        "I'm sorry about that. Aura asks customers to report damaged or defective products within 48 hours with photos. The eligible resolution is replacement.",
      orderId,
      intent: "DAMAGED_PRODUCT",
      resolution: "POLICY_PROVIDED",
    };
  }

  /* -------------------------------------------------------
     SHIPPING
  ------------------------------------------------------- */

  if (
    text.includes("shipping") ||
    text.includes("delivery charge") ||
    text.includes("shipping fee") ||
    text.includes("delivery fee")
  ) {
    return {
      response: policies.shipping,
      orderId,
      intent: "SHIPPING_POLICY",
      resolution: "RESOLVED",
    };
  }

  /* -------------------------------------------------------
     COD
  ------------------------------------------------------- */

  if (
    text.includes("cod") ||
    text.includes("cash on delivery") ||
    text.includes("cash delivery") ||
    text.includes("upi")
  ) {
    return {
      response: policies.cod,
      orderId,
      intent: "COD",
      resolution: "RESOLVED",
    };
  }

  /* -------------------------------------------------------
     ORDER STATUS
  ------------------------------------------------------- */

  if (
    text.includes("track") ||
    text.includes("tracking") ||
    text.includes("where is") ||
    text.includes("delivery") ||
    text.includes("order status") ||
    text.includes("status") ||
    orderId
  ) {
    if (!orderId) {
      return {
        response:
          "Sure, I can check your order. Please tell me your order number, for example ORD-101.",
        orderId: null,
        intent: "ORDER_STATUS",
        resolution: "WAITING_FOR_ORDER_ID",
      };
    }

    const order = getOrderDetails(orderId);

    if (!order) {
      return {
        response:
          `I couldn't find ${orderId}. Please check the order number and tell me again.`,
        orderId,
        intent: "ORDER_STATUS",
        resolution: "ORDER_NOT_FOUND",
      };
    }

    return {
      response:
        `I found ${orderId}. It is for ${order.product}, worth ${order.amount}. The current status is ${order.status}. It is being handled by ${order.courier}, and the tracking number is ${order.tracking}. ${order.delivery}.`,
      orderId,
      intent: "ORDER_STATUS",
      resolution: "RESOLVED",
    };
  }

  /* -------------------------------------------------------
     GREETING
  ------------------------------------------------------- */

  if (
    text.includes("hello") ||
    text.includes("hi") ||
    text.includes("hey")
  ) {
    return {
      response:
        "Hello! I'm Aria from Aura Skincare. How can I help you today?",
      orderId,
      intent: "GENERAL_SUPPORT",
      resolution: "IN_PROGRESS",
    };
  }

  /* -------------------------------------------------------
     THANK YOU
  ------------------------------------------------------- */

  if (
    text.includes("thank you") ||
    text.includes("thanks")
  ) {
    return {
      response:
        "You're welcome! I'm happy to help. Is there anything else you need from Aura Skincare?",
      orderId,
      intent: "GENERAL_SUPPORT",
      resolution: "RESOLVED",
    };
  }

  /* -------------------------------------------------------
     DEFAULT
  ------------------------------------------------------- */

  return {
    response:
      "I can help with Aura Skincare orders, delivery tracking, returns, cancellations, damaged products, shipping, and Cash on Delivery. What would you like to know?",
    orderId,
    intent: "GENERAL_SUPPORT",
    resolution: "IN_PROGRESS",
  };
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Home() {
  const [callActive, setCallActive] = useState(false);
  const [state, setState] = useState("Ready");

  const [selectedOrder, setSelectedOrder] = useState<Order>(
    orders[0]
  );

  const [messages, setMessages] = useState<Message[]>([]);

  const [lastIntent, setLastIntent] =
    useState("GENERAL_SUPPORT");

  const [lastResolution, setLastResolution] =
    useState("IN_PROGRESS");

  const [lastOrderId, setLastOrderId] =
    useState<string | null>(null);

  const [transcriptText, setTranscriptText] =
    useState("");

  const [browserSupported, setBrowserSupported] =
    useState(true);

  const [isListening, setIsListening] =
    useState(false);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const recognitionRef = useRef<any>(null);

  const lastProcessedSpeechRef =
    useRef("");

  /* =======================================================
     CHECK BROWSER SUPPORT
  ======================================================= */

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setBrowserSupported(false);
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}

      window.speechSynthesis.cancel();
    };
  }, []);

  /* =======================================================
     SPEAK
  ======================================================= */

  function speak(
    text: string,
    afterSpeech?: () => void
  ) {
    if (typeof window === "undefined") {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    const voices =
      window.speechSynthesis.getVoices();

    const indianVoice =
      voices.find(
        (voice) => voice.lang === "en-IN"
      ) ||
      voices.find(
        (voice) =>
          voice.lang.startsWith("en-IN")
      ) ||
      voices.find(
        (voice) =>
          voice.lang.startsWith("en")
      );

    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setState("Speaking");
    };

    utterance.onend = () => {
      setIsSpeaking(false);

      if (callActive) {
        setState("Ready for you");
      }

      if (afterSpeech) {
        afterSpeech();
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);

      if (callActive) {
        setState("Ready for you");
      }

      if (afterSpeech) {
        afterSpeech();
      }
    };

    window.speechSynthesis.speak(
      utterance
    );
  }

  /* =======================================================
     START LISTENING
  ======================================================= */

  function startListening() {
    if (!callActive) {
      return;
    }

    if (isSpeaking) {
      return;
    }

    if (!browserSupported) {
      setState("Browser not supported");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {}

    const recognition =
      new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setState("Listening");
      setTranscriptText("");
      lastProcessedSpeechRef.current = "";
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const currentText =
          event.results[i][0].transcript;

        if (
          event.results[i].isFinal
        ) {
          finalText += currentText;
        } else {
          interimText += currentText;
        }
      }

      setTranscriptText(
        finalText || interimText
      );

      if (finalText.trim()) {
        const cleanText =
          finalText.trim();

        /*
          Prevent duplicate speech
        */

        if (
          lastProcessedSpeechRef.current ===
          cleanText
        ) {
          return;
        }

        lastProcessedSpeechRef.current =
          cleanText;

        handleUserSpeech(cleanText);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setState("Microphone blocked");

        setMessages((previous) => [
          ...previous,
          {
            speaker: "Aria",
            text:
              "I cannot access your microphone. Please allow microphone permission in Chrome and click Speak again.",
          },
        ]);

        return;
      }

      if (
        event.error === "no-speech"
      ) {
        setState("No speech detected");
        return;
      }

      setState("Ready for you");
    };

    recognition.onend = () => {
      setIsListening(false);

      if (
        callActive &&
        !isSpeaking &&
        state === "Listening"
      ) {
        setState("Ready for you");
      }
    };

    recognitionRef.current =
      recognition;

    lastProcessedSpeechRef.current =
      "";

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setState("Ready for you");
    }
  }

  /* =======================================================
     HANDLE USER SPEECH
  ======================================================= */

  function handleUserSpeech(
    text: string
  ) {
    if (!text.trim()) {
      return;
    }

    setIsListening(false);
    setState("Thinking");
    setTranscriptText(text);

    try {
      recognitionRef.current?.stop();
    } catch {}

    /*
      Add customer message
    */

    setMessages((previous) => [
      ...previous,
      {
        speaker: "Customer",
        text,
      },
    ]);

    /*
      Generate Aria response
    */

    const result =
      generateResponse(text);

    setLastIntent(
      result.intent
    );

    setLastResolution(
      result.resolution
    );

    setLastOrderId(
      result.orderId
    );

    /*
      Update selected order
    */

    if (result.orderId) {
      const order =
        getOrderDetails(
          result.orderId
        );

      if (order) {
        setSelectedOrder(order);
      }
    }

    /*
      Add Aria message
    */

    setMessages((previous) => [
      ...previous,
      {
        speaker: "Aria",
        text: result.response,
      },
    ]);

    /*
      Speak response
    */

    speak(result.response);
  }

  /* =======================================================
     START CALL
  ======================================================= */

  function startCall() {
    if (!browserSupported) {
      setState("Browser not supported");
      return;
    }

    setCallActive(true);

    setState("Speaking");

    setMessages([]);

    setLastIntent(
      "GENERAL_SUPPORT"
    );

    setLastResolution(
      "IN_PROGRESS"
    );

    setLastOrderId(null);

    setTranscriptText("");

    const greeting =
      "Hi, I'm Aria from Aura Skincare. How can I help you today?";

    setMessages([
      {
        speaker: "Aria",
        text: greeting,
      },
    ]);

    /*
      Speak greeting.

      IMPORTANT:
      Microphone does NOT automatically start.

      User clicks Speak after Aria finishes.
    */

    setTimeout(() => {
      speak(greeting);
    }, 200);
  }

  /* =======================================================
     END CALL
  ======================================================= */

  function endCall() {
    try {
      recognitionRef.current?.stop();
    } catch {}

    if (
      typeof window !== "undefined"
    ) {
      window.speechSynthesis.cancel();
    }

    setIsListening(false);
    setIsSpeaking(false);

    setCallActive(false);
    setState("Call ended");
  }

  /* =======================================================
     STRUCTURED SUMMARY
  ======================================================= */

  const callSummary = {
    customer_intent: lastIntent,
    order_id:
      lastOrderId || "N/A",
    resolution_status:
      lastResolution,
    call_summary:
      messages.length > 0
        ? messages
            .map(
              (message) =>
                `${message.speaker}: ${message.text}`
            )
            .join(" ")
        : "No conversation recorded.",
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-900">

      {/* HEADER */}

      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Aura Skincare
            </h1>

            <p className="text-sm text-zinc-500">
              AI Customer Support Agent
            </p>
          </div>

          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500" />
            Agent Online
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* HERO */}

        <section className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight">
            Aria — Aura&apos;s AI Support Specialist
          </h2>

          <p className="mt-2 max-w-2xl text-zinc-600">
            Ask about orders, shipping, returns,
            cancellations, COD, and other Aura
            Skincare support questions.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* VOICE AGENT */}

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">

            <div className="flex items-center justify-between">

              <div>
                <h3 className="text-lg font-semibold">
                  Voice Support
                </h3>

                <p className="text-sm text-zinc-500">
                  Browser microphone & speaker
                </p>
              </div>

              <div
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  state === "Listening"
                    ? "bg-green-100 text-green-700"
                    : state === "Thinking"
                    ? "bg-yellow-100 text-yellow-700"
                    : state === "Speaking"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {state}
              </div>

            </div>

            {/* VOICE CIRCLE */}

            <div className="my-10 flex justify-center">

              <div
                className={`flex h-40 w-40 items-center justify-center rounded-full border-8 ${
                  callActive
                    ? "border-green-200 bg-green-50"
                    : "border-zinc-100 bg-zinc-50"
                }`}
              >

                <div
                  className={`flex h-28 w-28 items-center justify-center rounded-full ${
                    isListening
                      ? "animate-pulse bg-green-600"
                      : isSpeaking
                      ? "animate-pulse bg-blue-600"
                      : callActive
                      ? "bg-green-600"
                      : "bg-zinc-800"
                  }`}
                >
                  <span className="text-4xl">
                    🎙️
                  </span>
                </div>

              </div>

            </div>

            {/* BUTTONS */}

            <div className="flex flex-wrap justify-center gap-3">

              {!callActive ? (

                <button
                  onClick={startCall}
                  className="rounded-full bg-zinc-900 px-8 py-3 font-medium text-white transition hover:bg-zinc-700"
                >
                  Start Call
                </button>

              ) : (

                <>
                  <button
                    onClick={startListening}
                    disabled={
                      isListening ||
                      isSpeaking
                    }
                    className={`rounded-full px-8 py-3 font-medium text-white transition ${
                      isListening ||
                      isSpeaking
                        ? "cursor-not-allowed bg-zinc-400"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isListening
                      ? "🎤 Listening..."
                      : isSpeaking
                      ? "🔊 Aria is speaking..."
                      : "🎤 Speak"}
                  </button>

                  <button
                    onClick={endCall}
                    className="rounded-full bg-red-600 px-8 py-3 font-medium text-white transition hover:bg-red-700"
                  >
                    End Call
                  </button>
                </>

              )}

            </div>

            {/* HELP TEXT */}

            {callActive &&
              !isListening &&
              !isSpeaking && (
                <div className="mt-4 text-center text-sm text-zinc-500">
                  Click <strong>🎤 Speak</strong>,
                  wait for Listening, then speak
                  normally.
                </div>
              )}

            {/* BROWSER WARNING */}

            {!browserSupported && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Your browser does not support
                speech recognition. Please use
                the latest Google Chrome.
              </div>
            )}

            {/* LIVE CONVERSATION */}

            <div className="mt-8 rounded-xl bg-zinc-50 p-5">

              <div className="flex items-center justify-between">

                <h4 className="font-medium">
                  Live Conversation
                </h4>

                {isListening && (
                  <span className="text-xs font-medium text-green-600">
                    ● Microphone active
                  </span>
                )}

              </div>

              {/* CURRENT SPEECH */}

              {transcriptText && (
                <div className="mt-3 rounded-lg border border-green-100 bg-green-50 p-3 text-sm">
                  <span className="font-semibold">
                    You:
                  </span>{" "}
                  {transcriptText}
                </div>
              )}

              {/* MESSAGES */}

              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto text-sm">

                {messages.length === 0 ? (

                  <p className="text-zinc-500">
                    Start a call to begin the
                    conversation.
                  </p>

                ) : (

                  messages.map(
                    (message, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-3 ${
                          message.speaker ===
                          "Aria"
                            ? "bg-white"
                            : "bg-zinc-100"
                        }`}
                      >
                        <span className="font-semibold">
                          {message.speaker}:
                        </span>{" "}
                        {message.text}
                      </div>
                    )
                  )

                )}

              </div>

            </div>

          </section>

          {/* TEST ORDERS */}

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

            <h3 className="text-lg font-semibold">
              Test Orders
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              Use these orders while testing
              the agent.
            </p>

            <div className="mt-5 space-y-3">

              {orders.map((order) => (

                <button
                  key={order.id}
                  onClick={() =>
                    setSelectedOrder(order)
                  }
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedOrder.id ===
                    order.id
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <span className="font-semibold">
                      {order.id}
                    </span>

                    <span className="text-xs text-zinc-500">
                      {order.status}
                    </span>

                  </div>

                  <p className="mt-1 text-sm">
                    {order.customer}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {order.product}
                  </p>

                </button>

              ))}

            </div>

            {/* SELECTED ORDER */}

            <div className="mt-5 rounded-xl bg-zinc-50 p-4">

              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Selected Order
              </p>

              <div className="mt-3 space-y-2 text-sm">

                <p>
                  <strong>Order:</strong>{" "}
                  {selectedOrder.id}
                </p>

                <p>
                  <strong>Customer:</strong>{" "}
                  {selectedOrder.customer}
                </p>

                <p>
                  <strong>Product:</strong>{" "}
                  {selectedOrder.product}
                </p>

                <p>
                  <strong>Amount:</strong>{" "}
                  {selectedOrder.amount}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {selectedOrder.status}
                </p>

                <p>
                  <strong>Courier:</strong>{" "}
                  {selectedOrder.courier}
                </p>

                <p>
                  <strong>Tracking:</strong>{" "}
                  {selectedOrder.tracking}
                </p>

                <p>
                  <strong>Delivery:</strong>{" "}
                  {selectedOrder.delivery}
                </p>

              </div>

            </div>

          </section>

        </div>

        {/* POLICIES */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

          <h3 className="text-lg font-semibold">
            Aura Support Policies
          </h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">

            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="font-medium">
                Shipping
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Free above ₹499. Otherwise
                ₹50. Standard delivery:
                3–5 business days.
              </p>
            </div>

            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="font-medium">
                Returns
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Within 7 days of delivery.
                Product must be unopened,
                unused, and in original
                packaging.
              </p>
            </div>

            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="font-medium">
                Damaged Items
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Report within 48 hours
                with photos for replacement.
              </p>
            </div>

            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="font-medium">
                Cancellation
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Cancellation is possible
                only while an order is
                Processing.
              </p>
            </div>

            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="font-medium">
                COD
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                COD available up to
                ₹2,500. Pay by cash or
                UPI at the doorstep.
              </p>
            </div>

          </div>

        </section>

        {/* POST CALL SUMMARY */}

        {!callActive &&
          state === "Call ended" && (

            <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

              <h3 className="text-lg font-semibold">
                Post-Call Summary
              </h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">

                {/* INTENT */}

                <div className="rounded-xl bg-zinc-50 p-4">

                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Customer Intent
                  </p>

                  <p className="mt-1 font-medium">
                    {lastIntent}
                  </p>

                </div>

                {/* RESOLUTION */}

                <div className="rounded-xl bg-zinc-50 p-4">

                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Resolution
                  </p>

                  <p className="mt-1 font-medium">
                    {lastResolution}
                  </p>

                </div>

                {/* ORDER */}

                <div className="rounded-xl bg-zinc-50 p-4">

                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Order ID
                  </p>

                  <p className="mt-1 font-medium">
                    {lastOrderId ||
                      "N/A"}
                  </p>

                </div>

                {/* SUMMARY */}

                <div className="rounded-xl bg-zinc-50 p-4 md:col-span-2">

                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Call Summary
                  </p>

                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    {callSummary.call_summary}
                  </p>

                </div>

                {/* JSON */}

                <div className="rounded-xl bg-zinc-900 p-4 text-white md:col-span-2">

                  <p className="text-xs uppercase tracking-wide text-zinc-400">
                    Structured JSON
                  </p>

                  <pre className="mt-3 overflow-x-auto text-xs leading-6">
                    {JSON.stringify(
                      callSummary,
                      null,
                      2
                    )}
                  </pre>

                </div>

                {/* FULL TRANSCRIPT */}

                <div className="rounded-xl bg-zinc-50 p-4 md:col-span-2">

                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Full Transcript
                  </p>

                  <div className="mt-3 space-y-2">

                    {messages.length ===
                    0 ? (

                      <p className="text-sm text-zinc-500">
                        No conversation
                        recorded.
                      </p>

                    ) : (

                      messages.map(
                        (
                          message,
                          index
                        ) => (

                          <div
                            key={index}
                            className="rounded-lg bg-white p-3 text-sm"
                          >
                            <strong>
                              {
                                message.speaker
                              }
                              :
                            </strong>{" "}
                            {
                              message.text
                            }
                          </div>

                        )
                      )

                    )}

                  </div>

                </div>

              </div>

            </section>

          )}

      </div>
    </main>
  );
}