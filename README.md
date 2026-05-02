<div align="center">
  
  # 🌱 Enliven
  **The Future of Agentic, Personalized Learning**

  *Transforming education from static content consumption into a highly intelligent, interactive, and adaptive journey.*

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](#)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](#)
  [![Groq AI](https://img.shields.io/badge/Powered_by-Groq_AI-F55036?style=for-the-badge&logo=artificial-intelligence&logoColor=white)](#)

</div>

<br />

## 💡 The Problem
Traditional e-learning platforms suffer from notoriously low completion rates. Why? They offer a **one-size-fits-all** curriculum, lack meaningful interaction, and fail to adapt to a student's individual pace. Furthermore, assessing a student's actual understanding in a remote environment is difficult without robust proctoring mechanisms. 

## 🚀 The Solution: Enliven
**Enliven** solves this by acting as a personal, AI-powered mentor. It generates dynamic roadmaps, provides an agentic "Study Buddy" that guides you through specific modules, and ensures academic integrity through browser-based AI proctoring. Finally, it analyzes your performance to give you a detailed, AI-generated coaching report.

---

## ✨ Key Features that Wow

### 🤖 1. Agentic AI "Study Buddy"
Not just another chatbot. Our Study Buddy is context-aware. It knows exactly which course, module, and difficulty level you are studying. It guides you, quizzes you, and refuses to just "give you the answers," acting as a true pedagogical tutor.

### 🛡️ 2. Real-Time AI Proctoring
We integrated `face-api.js` directly into the browser to ensure assessment integrity.
- Tracks tab switches and warns the user.
- Uses facial recognition to detect "Looking away", "Multiple faces", or "Face not detected".
- Dynamically logs violations to calculate an overall **Integrity Score** for every test.

### 📊 3. Smart Analytics & AI Coaching
Every assessment attempt is recorded and visualized using beautiful `Chart.js` graphs. Based on your scores, time taken, and integrity flags, the backend queries the **Groq AI (Llama 3)** to generate a personalized, encouraging performance report for each specific course you take.

### 🎮 4. Deep Gamification
Learning should be fun.
- **Student Passport:** A beautiful, glassmorphism profile card featuring dynamic `DiceBear` avatars.
- **XP & Leveling System:** Earn XP by maintaining daily streaks, completing lessons, and earning badges. Watch your rank grow from *Novice Explorer* to *Grandmaster*.

---

## 🛠️ Tech Stack architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, Lucide React, Chart.js, Face-API.js |
| **Backend** | Node.js, Express.js, JSON Web Tokens (JWT) |
| **Database** | MongoDB, Mongoose |
| **AI Inference** | Groq API (Llama-3.3-70b-versatile) for hyper-fast LLM responses |

---

## 📸 Sneak Peek

> **Note to Judges:** The UI has been painstakingly designed from scratch. We utilized a warm, engaging color palette (Maroon, Cream, Soft Greens/Yellows) with extensive use of modern CSS techniques like Glassmorphism, dynamic gradients, and micro-animations to create a premium feel.

---

## ⚙️ Quick Start Guide

To get Enliven running locally for development or demonstration:

### 1. Clone the repository
```bash
git clone https://github.com/your-username/enliven.git
cd enliven
```

### 2. Setup the Backend
```bash
cd enliven-backend
npm install
# Create a .env file with your MONGO_URI, JWT_SECRET, and GROQ_API_KEY
npm run dev
```

### 3. Setup the Frontend
```bash
cd enliven-frontend
npm install
# Create a .env file with VITE_API_URL=http://localhost:5000
npm run dev
```

---

## 🌍 Roadmap & Future Enhancements
- **Multi-modal AI:** Allow students to upload handwritten notes for the Study Buddy to analyze.
- **Collaborative Rooms:** Let users join "Study Rooms" with friends using WebRTC.
- **Voice Interactivity:** Integrate Speech-to-Text so users can talk to their AI mentor.

---

## 👩‍💻 The Team Behind Enliven

Built with ❤️ and ☕ by:

- **Agila A** — *B.Tech IT* 
- **Bhuvaneshwari S** — *B.Tech IT* 

<div align="center">
  <i>If you like this project, don't forget to leave a ⭐!</i>
</div>

