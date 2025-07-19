# FoodieHub: A Collaborative Food Review AppFoodieHub 
is a modern, real-time web application where users can share and discover reviews for specific dishes at restaurants. It's a food blog platform designed for culinary enthusiasts to post their experiences, complete with photos, ratings, and detailed feedback, which other users can then upvote or downvote.

# Key Features
## Real-Time Food Feed: A dynamic home page displaying all user reviews in a beautiful 3-column grid layout.
## Create Verified Reviews: Users can post detailed reviews including dish name, restaurant, area, rating, price, and food type (Veg/Non-Veg).
## Image Uploads: Users must upload a photo of the dish and a bill/receipt for authenticity.
## Gemini AI Verification: Utilizes the Google Gemini API to scan the uploaded receipt and verify that the restaurant and dish names match the review content, adding a "Verified" badge to authentic reviews.
## Interactive Voting: Users can upvote or downvote reviews to express their agreement.
## Advanced Filtering & Search: The feed can be searched by dish, restaurant, or area, and filtered by food type and price range.
## Fully Responsive: A clean, modern UI that works seamlessly on desktop, tablet, and mobile devices.

# Technologies Used
## Frontend: React.js
## Backend & Database: Google Firebase (Firestore, Authentication)
## Styling: Tailwind CSSAI / Machine Learning: Google Gemini API for image-to-text verification.
## Icons: Lucide React

# Getting Started: Running Locally
Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

## Prerequisites
You must have Node.js (which includes npm) installed on your machine.

## Installation & Setup
## 1. Clone the Repository
Open your terminal and clone the project from your GitHub repository.
### git clone https://github.com/your-username/foodie-hub-app.git
### cd foodie-hub-app

## 2. Install Dependencies
Install all the necessary npm packages.
### npm install

## 3. Set Up Environment Variables
Create a new file in the root of your project named .env. This file will hold your secret keys and configuration.
### touch .env

Open the .env file and add the following, replacing the placeholder values with your actual keys:
# Your Unique App ID (can be any string for local dev)
REACT_APP_APP_ID=foodie-hub-local-dev

# Your Firebase Project Configuration
REACT_APP_FIREBASE_API_KEY="AIzaSy..."
REACT_APP_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
REACT_APP_FIREBASE_PROJECT_ID="your-project-id"
REACT_APP_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
REACT_APP_FIREBASE_MESSAGING_SENDER_ID="..."
REACT_APP_FIREBASE_APP_ID="..."

# Your Google Gemini API Key
REACT_APP_GEMINI_API_KEY="AIzaSy..."
You can get your Firebase config from your Firebase project settings and your Gemini key from Google AI Studio.Connect to Firebase in the CodeYou'll need to slightly modify the code to use these new environment variables. Open src/App.js and replace the existing firebaseConfig object with this:const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};
And update the Gemini API key line:const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
Run the ApplicationStart the local development server.npm start
The application should now be running in your browser at http://localhost:3000.☁️ DeploymentThis application is configured for easy deployment using Firebase Hosting. Once you have made your changes, follow these steps:Build the project:npm run build
Deploy to Firebase:firebase deploy
