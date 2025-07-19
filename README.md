# FoodieHub: A Collaborative Food Review App

FoodieHub is a modern, real-time web application that allows users to share and discover reviews for specific dishes at restaurants. Designed for culinary enthusiasts, it lets you post detailed experiences—complete with photos, ratings, and feedback—while also supporting interactive features for the community.
# [foodie-hub-app](https://myfoodiehubapp.web.app/) 

##  Key Features

- **Real-Time Food Feed:**  Dynamic homepage displaying all user reviews in a beautiful 3-column grid layout.

- **Create Verified Reviews:**  Post detailed reviews including dish name, restaurant, area, rating, price, and food type (Veg/Non-Veg).

- **Image Uploads:**  Users must upload both a photo of the dish and a bill/receipt for authenticity.

- **Gemini AI Verification:**  Utilizes the Google Gemini API to scan uploaded receipts, verifying that the restaurant and dish names match the review content. Verified reviews receive a special badge.

- **Interactive Voting:**  Upvote or downvote reviews to express agreement.

- **Advanced Filtering & Search:**  Search the feed by dish, restaurant, or area. Filter by food type and price range.

- **Fully Responsive:**  Enjoy a clean, modern UI across desktop, tablet, and mobile devices.

##  Technologies Used

- **Frontend:** [React.js](https://react.dev/)
- **Backend & Database:** [Google Firebase (Firestore, Authentication, Storage)](https://firebase.google.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **AI / Machine Learning:** [Google Gemini API](https://ai.google.dev/) for image-to-text receipt verification
- **Icons:** [Lucide React](https://lucide.dev/)

##  Getting Started: Running Locally

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

- Node.js and npm installed on your machine

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/your-username/foodie-hub-app.git
cd foodie-hub-app
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Environment Variables

Create a new `.env` file in the root of your project:

```bash
touch .env
```

Add the following content, replacing the placeholder values with your actual keys:

```env
# Unique App ID (any string for local dev)
REACT_APP_APP_ID=foodie-hub-local-dev

# Firebase Project Configuration
REACT_APP_FIREBASE_API_KEY="AIzaSy..."
REACT_APP_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
REACT_APP_FIREBASE_PROJECT_ID="your-project-id"
REACT_APP_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
REACT_APP_FIREBASE_MESSAGING_SENDER_ID="..."
REACT_APP_FIREBASE_APP_ID="..."

# Google Gemini API Key
REACT_APP_GEMINI_API_KEY="AIzaSy..."
```

- Retrieve your Firebase config from your [Firebase Console](https://console.firebase.google.com/) project settings.
- Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/).

#### 4. Connect to Firebase in the Code

Open `src/App.js` and ensure the `firebaseConfig` object uses your environment variables:

```js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};
```

Likewise, set your Gemini API key:

```js
const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
```

#### 5. Run the Application

```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## ☁️ Deployment

FoodieHub is ready for Firebase Hosting. Here’s how to deploy:

1. **Build the project:**

   ```bash
   npm run build
   ```

2. **Deploy to Firebase:**

   ```bash
   firebase deploy
   ```

##  Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.



## 💡 Credits

- [React](https://react.dev/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Google Gemini API](https://ai.google.dev/)
- [Lucide Icons](https://lucide.dev/)

> _FoodieHub_ – Savor the world, one review at a time!
