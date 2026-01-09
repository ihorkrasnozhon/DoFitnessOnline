import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

console.log("🔑 Loaded OpenAI API key:", process.env.REACT_APP_OPENAI_API_KEY ? "✅ Found" : "❌ Missing");
console.log("🔑 Loaded Gemini API key:", process.env.REACT_APP_GEMINI_API_KEY ? "✅ Found" : "❌ Missing");

// app.post("/api/ask", async (req, res) => {
//     try {
//         const response = await fetch("https://api.openai.com/v1/chat/completions", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "Authorization": `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
//             },
//             body: JSON.stringify({
//                 model: "gpt-4o-mini",
//                 messages: [
//                     { role: "system", content: "Ти фітнес-тренер, який аналізує вправи." },
//                     { role: "user", content: req.body.text },
//                 ],
//             }),
//         });
//
//         const data = await response.json();
//         res.json(data);
//         console.log("✅ Відповідь від OpenAI:", data);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// app.post("/api/ask", async (req, res) => {
//     try {
//         const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
//         const prompt = req.body.text || "Немає тексту для аналізу.";
//
//         const response = await fetch(
//             `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
//             {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     contents: [
//                         {
//                             role: "user",
//                             parts: [
//                                 {
//                                     text:
//                                         "Ти фітнес-тренер, який аналізує вправи та підказує, як поліпшити техніку.\n\n" +
//                                         prompt,
//                                 },
//                             ],
//                         },
//                     ],
//                 }),
//             }
//         );
//
//         const data = await response.json();
//         console.log("✅ Повна відповідь від Gemini:");
//         console.dir(data, { depth: null });
//
//         const answer =
//             data?.candidates?.[0]?.content?.parts?.[0]?.text ||
//             "Не вдалося отримати відповідь від Gemini.";
//
//         console.log("✅ Відповідь від Gemini:", answer);
//         res.json({ reply: answer });
//     } catch (error) {
//         console.error("❌ Помилка Gemini API:", error);
//         res.status(500).json({ error: error.message });
//     }
// });

app.listen(5000, () => console.log("✅ Server running on port 5000"));
