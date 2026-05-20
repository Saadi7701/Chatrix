# 🚀 Chatrix: Futuristic AI Chat Platform

Welcome to **Chatrix**! This is a highly advanced, full-stack real-time communication platform. It features instant messaging, high-quality audio and video calls, stealth security codes, background push notifications, and a futuristic design.

This document explains exactly how everything works behind the scenes in easy-to-understand words.

---

## 🛠️ Technology Stack (How it all connects)

Chatrix is built using the **MERN/PERN stack** combined with modern real-time technologies:

1. **Frontend (The User Interface):** Built with **React** and **Vite**. We use **Tailwind CSS** for the beautiful styling and **Framer Motion** for smooth, futuristic animations. This is what the user sees and interacts with.
2. **Backend (The Brain):** Built with **Node.js** and **Express**. This server handles all the logic, like checking passwords, securely saving files, and verifying users.
3. **Database (The Memory):** We use **PostgreSQL** (hosted on Supabase) managed by **Prisma ORM**. Prisma acts as a translator between our Node.js server and the SQL database, making it extremely fast to save and find messages.
4. **Real-time Engine:** We use **Socket.io**. While normal web traffic (HTTP) asks for data and waits for a response, Socket.io keeps an open "pipe" between the phone and the server so messages can instantly fly back and forth without waiting.

---

## 💬 How Messaging Works (Text, Audio, Video, Images)

When you type a message and hit send, here is the workflow:

1. **Text Messages:**
   - Your React app sends the text to the Node.js server through the open **Socket.io** connection.
   - The server catches it, saves it to the **PostgreSQL Database** so it's stored permanently, and then instantly pushes it through the socket to your friend's phone. 
   - Your friend's screen updates instantly without them needing to refresh the page.

2. **Media Messages (Pictures, Videos, Voice Notes):**
   - You cannot send a giant video file directly through a tiny socket pipe.
   - When you select a picture or record a Voice Note, the React frontend first sends the file to the Node.js server via a standard HTTP upload (API).
   - The backend server takes that file, uploads it securely to **Cloudinary** (a cloud file storage service), and gets a URL link back (e.g., `cloudinary.com/my-video.mp4`).
   - The backend then sends *just the URL link* through Socket.io to your friend. Your friend's phone receives the link and displays the image/video beautifully on their screen!

---

## 📞 How Audio & Video Calls Work (WebRTC Explained)

Audio and Video calls do **not** use Socket.io to send the actual video. Video files are too massive and would crash the server. Instead, we use a military-grade peer-to-peer technology called **WebRTC** (Web Real-Time Communication).

**The WebRTC Workflow:**
1. **The Signal:** When you click "Call", your phone uses Socket.io to send a tiny text message to your friend saying, "Hey, I want to call you, here is my internet IP address."
2. **The Handshake:** Your friend's phone replies, "I accept! Here is my internet IP address." 
3. **The Direct Connection (P2P):** Now that both phones know each other's IP addresses, they connect **directly to each other**. The video and audio flow directly from your laptop to their phone, completely bypassing our backend server. This makes the call incredibly fast and secure.

**The "Link Lost" Problem (Symmetric NAT) & TURN Servers:**
Sometimes, mobile networks (4G/5G) or strong Wi-Fi firewalls hide your real IP address. If WebRTC can't find a direct path between the two phones, the handshake fails (Link Lost). 
To fix this, we use a **TURN Server** (Metered/Twilio). A TURN server acts as a middleman in the cloud. If the phones can't connect directly, they both connect to the TURN server, which safely bounces the video from one phone to the other, guaranteeing the call connects!

---

## 🕵️‍♂️ Unique Codes & Stealth Codes

Chatrix has a unique security system designed for privacy:

1. **Unique Code (User Code):** Instead of giving out your phone number, you get a cool futuristic handle (like `alpha_x`). Users search for this code to add you.
2. **Stealth Code (Ghost Mode):** You can set a secret password in your Settings (e.g., `AURA_99`). When you type this exact secret code into the main search bar on the Chat Page, it unlocks hidden features (like instantly turning off Ghost Mode or unmasking hidden chats). It acts as a secret backdoor that only you know about!

---

## 📲 The "App Installation" Pop-up (PWA System)

You noticed that when you open Chatrix in Google Chrome, a futuristic pop-up appears asking you to "Install Chatrix".

**How an APK / Web App is installed without the App Store:**
Chatrix is built as a **Progressive Web App (PWA)**. 
1. We provide the browser with a `manifest.json` file. This is an instruction manual that tells the phone what the App Icon should look like, the app's name, and what color the top bar should be.
2. We provide a **Service Worker** (`sw.js`). This is a script that runs invisibly in the background of the phone even when the browser is closed.
3. Because we have both of these, the browser realizes Chatrix is a "Real App". 
4. Our React code intercepts the browser, forces our custom futuristic Pop-Up to appear, and when you click "Install", the phone's Operating System packages the website into a native App (like an APK on Android) and places it directly on your Home Screen!

---

## 🔔 How the Background Notification System Works

When you receive a message while the app is closed, you still get a vibration and a notification! Here is the magic workflow:

1. **The Permission:** When you turn on Notifications in Settings, the browser asks for your permission.
2. **The Keys (VAPID):** We use cryptographic keys (VAPID) to prove to Google/Apple that we own the Chatrix app. 
3. **The Subscription:** Your phone generates a unique, secret URL (a Push Subscription) and saves it to our Database.
4. **The Trigger:** When your friend sends you a message, the Node.js server checks if you are online. If you are offline, it takes your secret Push Subscription URL and beams a message to Google/Apple's global notification servers using our VAPID keys.
5. **The Delivery:** Google/Apple instantly wakes up your phone. The invisible **Service Worker** (`sw.js`) catches the message, builds a beautiful notification card with your friend's profile picture, and pushes it to your phone's lock screen!
