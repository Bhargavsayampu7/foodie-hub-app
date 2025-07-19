import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged,
    signInWithCustomToken
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    onSnapshot,
    query,
    Timestamp,
    runTransaction
} from 'firebase/firestore';
import { ThumbsUp, ThumbsDown, Star, Bell, Search, CheckCircle, XCircle, Menu, X } from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyB7TPtIIC-LdZj901NkBryugo1k8oP3mmg",
  authDomain: "myfoodiehubapp.firebaseapp.com",
  projectId: "myfoodiehubapp",
  storageBucket: "myfoodiehubapp.firebasestorage.app",
  messagingSenderId: "458964856547",
  appId: "1:458964856547:web:1d4f819fb087b10ddb9fd6",
  measurementId: "G-D4WQF02Y0X"
};
const appId = process.env.REACT_APP_APP_ID || 'default-foodie-hub';

// --- Gemini API Helper ---
async function verifyReceiptWithGemini(base64ImageData, restaurantName, dishName) {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = `Analyze the receipt image to verify it contains "${restaurantName}" and "${dishName}". Respond with JSON: {"verified": boolean, "reason": "explanation"}.`;

    const payload = {
      contents: [{ role: "user", parts: [ { text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64ImageData } } ] }]
    };

    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const result = await response.json();
        const text = result.candidates[0].content.parts[0].text;
        const jsonStringMatch = text.match(/{.*}/s);
        if (jsonStringMatch) return JSON.parse(jsonStringMatch[0]);
        throw new Error("Invalid JSON response from API");
    } catch (error) {
        console.error("Gemini API Error:", error);
        return { verified: false, reason: "Could not analyze the receipt." };
    }
}

// --- Time Formatting Helper ---
function timeAgo(date) {
    if (!date) return 'some time ago';
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

// --- Main App Component ---
export default function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('home'); // home, explore, create

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                } else {
                    try {
                      await signInAnonymously(firebaseAuth);
                    } catch (authError) {
                        console.error("Authentication failed:", authError);
                        setError("Could not log you in.");
                    }
                }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase initialization error:", e);
            setError("Failed to connect to the review service.");
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthReady || !db) return;
        setIsLoading(true);
        const reviewsCollectionPath = `/artifacts/${appId}/public/data/reviews`;
        const q = query(collection(db, reviewsCollectionPath));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const reviewsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            setReviews(reviewsData);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching reviews:", err);
            setError("Could not fetch reviews.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [isAuthReady, db]);

    return (
        <div className="relative flex size-full min-h-screen flex-col bg-white group/design-root overflow-x-hidden" style={{fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif'}}>
            <div className="layout-container flex h-full grow flex-col">
                <Header user={user} activeView={activeView} setActiveView={setActiveView} />
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative my-4 mx-auto" role="alert">{error}</div>}
                
                <main className="flex flex-1 justify-center py-5 px-4 sm:px-10">
                    {!isAuthReady || !db ? (
                         <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#e92932]"></div>
                        </div>
                    ) : (
                        activeView === 'create' ? (
                            <ReviewForm db={db} user={user} setActiveView={setActiveView} />
                        ) : (
                            <HomePage reviews={reviews} isLoading={isLoading} db={db} user={user} />
                        )
                    )}
                </main>
            </div>
        </div>
    );
}

// --- Header Component ---
function Header({ user, activeView, setActiveView }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleNavClick = (view) => {
        setActiveView(view);
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="relative flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f4f1f1] px-4 sm:px-10 py-3">
            <div className="flex items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-3 text-[#171212]">
                    <div className="size-6 text-[#e92932]">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor"></path></svg>
                    </div>
                    <a href="#" onClick={(e) => {e.preventDefault(); handleNavClick('home')}} className="cursor-pointer">
                        <h2 className="text-[#171212] text-lg font-bold leading-tight tracking-[-0.015em] hover:text-[#e92932] transition-colors">FoodieHub</h2>
                    </a>
                </div>
                <nav className="hidden md:flex items-center gap-9">
                    <a href="#" onClick={(e) => {e.preventDefault(); handleNavClick('home')}} className={`text-[#171212] text-sm font-medium leading-normal ${activeView === 'home' ? 'text-[#e92932]' : ''}`}>Home</a>
                    {/* <a href="#" onClick={(e) => {e.preventDefault(); handleNavClick('explore')}} className={`text-[#171212] text-sm font-medium leading-normal ${activeView === 'explore' ? 'text-[#e92932]' : ''}`}>Explore</a> */}
                    <a href="#" onClick={(e) => {e.preventDefault(); handleNavClick('create')}} className={`text-[#171212] text-sm font-medium leading-normal ${activeView === 'create' ? 'text-[#e92932]' : ''}`}>Create</a>
                </nav>
            </div>

            <div className="flex flex-1 justify-end items-center gap-2 sm:gap-4">
                {/* Notification button removed */}
                <div className="hidden sm:block bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/a/ACg8ocK_gS_zKtS4Cgutxjd2rdNp4AUNmVLLcBi5MT-KMXktqrte=s96-c")'}}></div>
                
                <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {isMobileMenuOpen && (
                <nav className="absolute top-full left-0 w-full bg-white shadow-lg md:hidden z-20">
                    <a href="#" onClick={(e) => {e.preventDefault(); handleNavClick('home')}} className="block py-3 px-4 text-sm font-medium text-[#171212] hover:bg-gray-50">Home</a>
                    {/* <a href="#" onClick={(e) => {e.preventDefault(); handleNavClick('explore')}} className="block py-3 px-4 text-sm font-medium text-[#171212] hover:bg-gray-50">Explore</a> */}
                    <a href="#" onClick={(e) => {e.preventDefault(); handleNavClick('create')}} className="block py-3 px-4 text-sm font-medium text-[#171212] hover:bg-gray-50">Create</a>
                </nav>
            )}
        </header>
    );
}

// --- Search Bar Component ---
function SearchBar({ onSearch, isHeader = false }) {
    return (
        <label className={`flex flex-col min-w-40 w-full ${isHeader ? '!h-10' : 'h-12'}`}>
            <div className="flex w-full flex-1 items-stretch rounded-xl h-full">
                <div className="text-[#82686a] flex border-none bg-[#f4f1f1] items-center justify-center pl-4 rounded-l-xl border-r-0">
                    <Search size={24} />
                </div>
                <input
                    placeholder="Search for dishes or restaurants"
                    onChange={(e) => onSearch(e.target.value)}
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-[#171212] focus:outline-0 focus:ring-0 border-none bg-[#f4f1f1] h-full placeholder:text-[#82686a] px-4 pl-2 text-base font-normal leading-normal"
                />
            </div>
        </label>
    );
}

// --- Home Page Component ---
// --- Home Page Component ---
function HomePage({ reviews, isLoading, db, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  const [priceFilter, setPriceFilter] = useState(5000);

  const filteredReviews = useMemo(() => {
      return reviews.filter(review => {
          const searchMatch = !searchTerm ||
              review.dishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              review.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (review.areaName && review.areaName.toLowerCase().includes(searchTerm.toLowerCase())) ||
              review.userName.toLowerCase().includes(searchTerm.toLowerCase());
          
          const foodTypeMatch = foodTypeFilter === 'all' || review.foodType === foodTypeFilter;
          
          const priceMatch = review.price <= priceFilter;

          return searchMatch && foodTypeMatch && priceMatch;
      });
  }, [reviews, searchTerm, foodTypeFilter, priceFilter]);

  if (isLoading) {
      return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">{[...Array(6)].map((_, i) => <FeedReviewCardSkeleton key={i} />)}</div>;
  }

  return (
      <div className="layout-content-container flex flex-col w-full max-w-7xl mx-auto flex-1">
          <div className="px-4 py-3">
              <SearchBar onSearch={setSearchTerm} />
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center px-4 py-3 border-b border-[#f4f1f1]">
              <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#171212]">Filter by:</span>
                  <button onClick={() => setFoodTypeFilter('all')} className={`px-3 py-1 text-sm rounded-full ${foodTypeFilter === 'all' ? 'bg-[#e92932] text-white' : 'bg-[#f4f1f1] text-[#171212]'}`}>All</button>
                  <button onClick={() => setFoodTypeFilter('veg')} className={`px-3 py-1 text-sm rounded-full ${foodTypeFilter === 'veg' ? 'bg-green-500 text-white' : 'bg-[#f4f1f1] text-[#171212]'}`}>Veg</button>
                  <button onClick={() => setFoodTypeFilter('non-veg')} className={`px-3 py-1 text-sm rounded-full ${foodTypeFilter === 'non-veg' ? 'bg-red-500 text-white' : 'bg-[#f4f1f1] text-[#171212]'}`}>Non-Veg</button>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                  <label htmlFor="price-range" className="text-sm font-medium text-[#171212]">Price up to: ₹{priceFilter}</label>
                  <input id="price-range" type="range" min="0" max="5000" step="100" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:py-6">
              {filteredReviews.map(review => (
                  <FeedReviewCard key={review.id} review={review} db={db} user={user} />
              ))}
          </div>
          {filteredReviews.length === 0 && !isLoading && (
               <div className="text-center p-10 col-span-full">
                  <h3 className="text-xl font-semibold text-[#171212]">No matching reviews found.</h3>
                  <p className="text-[#82686a] mt-2">Try adjusting your filters or create a new review!</p>
              </div>
          )}
      </div>
  );
}

// --- Modal Component ---
function Modal({ show, onClose, children }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
                 <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}

// --- Feed Review Card Component ---
// --- Feed Review Card Component ---
function FeedReviewCard({ review, db, user }) {
  const { id, restaurantName, dishName, createdAt, upvotedBy = [], downvotedBy = [], userName, dishImageUrl, reviewText, rating, foodType, areaName, price } = review;
  
  const handleVote = async (voteType) => {
      if (!user || !db) return;
      const reviewDocRef = doc(db, `/artifacts/${appId}/public/data/reviews`, id);
      const userId = user.uid;
      try {
          await runTransaction(db, async (transaction) => {
              const reviewDoc = await transaction.get(reviewDocRef);
              if (!reviewDoc.exists()) throw "Document does not exist!";
              const data = reviewDoc.data();
              const currentUpvotedBy = data.upvotedBy || [];
              const currentDownvotedBy = data.downvotedBy || [];
              let newUpvotedBy = [...currentUpvotedBy];
              let newDownvotedBy = [...currentDownvotedBy];
              if (voteType === 'upvote') {
                  newUpvotedBy = currentUpvotedBy.includes(userId) ? currentUpvotedBy.filter(uid => uid !== userId) : [...currentUpvotedBy, userId];
                  newDownvotedBy = currentDownvotedBy.filter(uid => uid !== userId);
              } else {
                  newDownvotedBy = currentDownvotedBy.includes(userId) ? currentDownvotedBy.filter(uid => uid !== userId) : [...currentDownvotedBy, userId];
                  newUpvotedBy = currentUpvotedBy.filter(uid => uid !== userId);
              }
              transaction.update(reviewDocRef, { upvotedBy: newUpvotedBy, downvotedBy: newDownvotedBy });
          });
      } catch (e) { console.error("Transaction failed: ", e); }
  };

  const finalImageUrl = dishImageUrl || `https://placehold.co/600x400/f4f1f1/e92932?text=${encodeURIComponent(dishName)}`;
  
  return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
          <img src={finalImageUrl} alt={dishName} className="w-full h-48 object-cover" />
          <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${foodType === 'veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {foodType}
                  </span>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      ₹{price}
                  </span>
              </div>
              <h3 className="text-lg font-bold text-[#171212] truncate">{dishName}</h3>
              <p className="text-sm text-[#82686a] truncate">{restaurantName}, {areaName}</p>
              <div className="flex items-center my-2">
                  {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  ))}
              </div>
              <p className="text-sm text-gray-600 h-10 overflow-hidden text-ellipsis">{reviewText}</p>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 cursor-pointer text-[#82686a] hover:text-[#e92932]" onClick={() => handleVote('upvote')}>
                          <ThumbsUp size={18} />
                          <span className="text-xs font-bold">{upvotedBy.length}</span>
                      </div>
                      <div className="flex items-center gap-1 cursor-pointer text-[#82686a] hover:text-[#e92932]" onClick={() => handleVote('downvote')}>
                          <ThumbsDown size={18} />
                          <span className="text-xs font-bold">{downvotedBy.length}</span>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-xs font-bold text-[#171212]">{userName}</p>
                      <p className="text-xs text-[#82686a]">{timeAgo(createdAt.toDate())}</p>
                  </div>
              </div>
          </div>
      </div>
  );
}

// --- Feed Review Card Skeleton ---
function FeedReviewCardSkeleton() {
    return (
        <div className="flex flex-col p-4 animate-pulse">
            <div className="p-4 @container border-b border-[#f4f1f1]">
                <div className="flex flex-col items-stretch justify-start rounded-xl @xl:flex-row @xl:items-start gap-4">
                    <div className="w-full @xl:w-1/3 bg-slate-200 aspect-video @xl:aspect-square rounded-xl"></div>
                    <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-2 py-4 @xl:px-4">
                        <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                        <div className="h-5 w-1/2 bg-slate-200 rounded"></div>
                        <div className="h-5 w-1/3 bg-slate-200 rounded"></div>
                    </div>
                </div>
                 <div className="flex flex-wrap gap-4 px-4 py-2 mt-4">
                    <div className="h-5 w-12 bg-slate-200 rounded"></div>
                    <div className="h-5 w-12 bg-slate-200 rounded"></div>
                </div>
                <div className="h-4 w-1/4 bg-slate-200 rounded mt-2 px-4"></div>
            </div>
        </div>
    );
}

// --- Review Form Component ---
function ReviewForm({ db, user, setActiveView }) {
    const [dishName, setDishName] = useState('');
    const [restaurantName, setRestaurantName] = useState('');
    const [areaName, setAreaName] = useState('');
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [billImage, setBillImage] = useState(null);
    const [billPreview, setBillPreview] = useState('');
    const [dishImage, setDishImage] = useState(null);
    const [dishImagePreview, setDishImagePreview] = useState('');
    const [userName, setUserName] = useState('');
    const [foodType, setFoodType] = useState('veg');
    const [price, setPrice] = useState(1000);
    const [verification, setVerification] = useState({ status: 'idle', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (type === 'bill') {
                setBillImage(file);
                setBillPreview(URL.createObjectURL(file));
            } else {
                setDishImage(file);
                setDishImagePreview(URL.createObjectURL(file));
            }
            setVerification({ status: 'idle', message: '' });
        }
    };

    const resetForm = () => {
        setDishName(''); setRestaurantName(''); setAreaName(''); setRating(0); setReviewText('');
        setBillImage(null); setBillPreview('');
        setDishImage(null); setDishImagePreview('');
        setUserName(''); setFoodType('veg'); setPrice(1000);
        setVerification({ status: 'idle', message: '' });
    };
    
    const fileToDataUrl = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!dishName.trim() || !restaurantName.trim() || !areaName.trim() || !reviewText.trim() || rating === 0 || !userName.trim()) {
            setVerification({ status: 'failed', message: 'All fields are required.' }); return;
        }
        if (!billImage || !dishImage) {
            setVerification({ status: 'failed', message: 'Please upload both a dish photo and a bill receipt.' }); return;
        }
        if (!user || !db) {
            setVerification({ status: 'failed', message: 'You must be logged in.' }); return;
        }

        setIsSubmitting(true);
        setVerification({ status: 'verifying', message: 'Verifying receipt...' });

        try {
            const billDataUrl = await fileToDataUrl(billImage);
            const base64BillData = billDataUrl.split(',')[1];
            const geminiResult = await verifyReceiptWithGemini(base64BillData, restaurantName, dishName);

            if (geminiResult.verified) {
                setVerification({ status: 'verified', message: ' Saving review...' });
                
                const dishDataUrl = await fileToDataUrl(dishImage);
                
                const reviewsCollectionPath = `/artifacts/${appId}/public/data/reviews`;
                await addDoc(collection(db, reviewsCollectionPath), {
                    dishName, restaurantName, areaName, rating, reviewText, userName, authorId: user.uid,
                    foodType, price: Number(price), location: 'Hyderabad',
                    createdAt: Timestamp.now(), upvotedBy: [], downvotedBy: [], isVerified: true,
                    dishImageUrl: dishDataUrl,
                });
                resetForm();
                setTimeout(() => setActiveView('home'), 1500);
            } else {
                setVerification({ status: 'failed', message: `Verification Failed: ${geminiResult.reason}` });
            }
        } catch (error) {
            console.error("Submission error:", error);
            setVerification({ status: 'failed', message: 'An error occurred during submission.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="layout-content-container flex flex-col w-full max-w-[512px] py-5">
            <h2 className="text-[#181111] tracking-light text-[28px] font-bold leading-tight px-4 text-center pb-3 pt-5">Share Your Culinary Experience</h2>
            <form onSubmit={handleSubmit} className="w-full">
                {/* Text Inputs */}
                <div className="flex flex-col gap-3 px-4 py-3">
                    <label className="flex flex-col w-full">
                        <p className="text-[#181111] text-base font-medium leading-normal pb-2">Dish Name</p>
                        <input placeholder="Enter the name of the dish" value={dishName} onChange={(e) => setDishName(e.target.value)} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181111] focus:outline-0 focus:ring-0 border-none bg-[#f4f0f0] focus:border-none h-14 placeholder:text-[#886364] p-4 text-base font-normal leading-normal" />
                    </label>
                    <label className="flex flex-col w-full">
                        <p className="text-[#181111] text-base font-medium leading-normal pb-2">Restaurant Name</p>
                        <input placeholder="Enter the name of the restaurant" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181111] focus:outline-0 focus:ring-0 border-none bg-[#f4f0f0] focus:border-none h-14 placeholder:text-[#886364] p-4 text-base font-normal leading-normal" />
                    </label>
                     <label className="flex flex-col w-full">
                        <p className="text-[#181111] text-base font-medium leading-normal pb-2">Area Name</p>
                        <input placeholder="e.g., Jubilee Hills" value={areaName} onChange={(e) => setAreaName(e.target.value)} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181111] focus:outline-0 focus:ring-0 border-none bg-[#f4f0f0] focus:border-none h-14 placeholder:text-[#886364] p-4 text-base font-normal leading-normal" />
                    </label>
                </div>
                
                {/* New Filters */}
                <div className="px-4 py-3 space-y-4">
                    <div>
                        <p className="text-[#181111] text-base font-medium leading-normal pb-2">Food Type</p>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="foodType" value="veg" checked={foodType === 'veg'} onChange={(e) => setFoodType(e.target.value)} className="form-radio h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500" />
                                <span className="text-sm">Veg</span>
                            </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="foodType" value="non-veg" checked={foodType === 'non-veg'} onChange={(e) => setFoodType(e.target.value)} className="form-radio h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500" />
                                <span className="text-sm">Non-Veg</span>
                            </label>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="price-range-form" className="text-[#181111] text-base font-medium leading-normal pb-2 block">Price: ₹{price}</label>
                        <input id="price-range-form" type="range" min="0" max="5000" step="100" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>

                {/* Rating */}
                <div className="flex flex-wrap gap-3 p-4">
                    {[1, 2, 3, 4, 5].map(star => (
                        <label key={star} className={`text-sm font-medium leading-normal flex items-center justify-center rounded-xl border px-4 h-11 text-[#181111] relative cursor-pointer transition-all ${rating === star ? 'border-[3px] border-[#e92932]' : 'border-[#e5dcdc]'}`}>
                            {star} Star{star > 1 && 's'}
                            <input type="radio" className="invisible absolute" name="rating" value={star} checked={rating === star} onChange={() => setRating(star)} />
                        </label>
                    ))}
                </div>

                {/* Review Text */}
                <div className="px-4 py-3">
                    <label className="flex flex-col w-full">
                        <p className="text-[#181111] text-base font-medium leading-normal pb-2">Review Text</p>
                        <textarea placeholder="Write your review here" value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181111] focus:outline-0 focus:ring-0 border-none bg-[#f4f0f0] focus:border-none min-h-36 placeholder:text-[#886364] p-4 text-base font-normal leading-normal"></textarea>
                    </label>
                </div>
                
                {/* Dish Photo Upload */}
                <div className="flex flex-col p-4">
                    <div className="flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-[#e5dcdc] px-6 py-14">
                        <p className="text-[#181111] text-lg font-bold">Upload Dish Photo</p>
                        <label className="cursor-pointer bg-[#f4f0f0] text-[#181111] text-sm font-bold py-2 px-4 rounded-xl">
                            Browse Files
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'dish')} />
                        </label>
                        {dishImagePreview && <img src={dishImagePreview} alt="Dish preview" className="mt-4 mx-auto h-24 w-auto rounded-md"/>}
                    </div>
                </div>

                {/* Bill Upload */}
                <div className="flex flex-col p-4">
                     <div className="flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-[#e5dcdc] px-6 py-14">
                        <p className="text-[#181111] text-lg font-bold">Upload Bill for Verification</p>
                        <label className="cursor-pointer bg-[#f4f0f0] text-[#181111] text-sm font-bold py-2 px-4 rounded-xl">
                            Browse Files
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bill')} />
                        </label>
                        {billPreview && <img src={billPreview} alt="Bill preview" className="mt-4 mx-auto h-24 w-auto rounded-md"/>}
                    </div>
                </div>

                {/* User Name */}
                <div className="px-4 py-3">
                    <label className="flex flex-col w-full">
                        <p className="text-[#181111] text-base font-medium leading-normal pb-2">Your Name</p>
                        <input placeholder="Enter your name" value={userName} onChange={(e) => setUserName(e.target.value)} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181111] focus:outline-0 focus:ring-0 border-none bg-[#f4f0f0] focus:border-none h-14 placeholder:text-[#886364] p-4 text-base font-normal leading-normal" />
                    </label>
                </div>

                {/* Verification Status */}
                {verification.status !== 'idle' && (
                    <div className={`flex items-center gap-2 p-2 mx-4 rounded-md text-sm ${
                        verification.status === 'verifying' ? 'bg-blue-50 text-blue-700' :
                        verification.status === 'verified' ? 'bg-green-50 text-green-700' :
                        verification.status === 'failed' ? 'bg-red-50 text-red-700' : ''
                    }`}>
                        {verification.status === 'verifying' && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>}
                        {verification.status === 'verified' && <CheckCircle className="w-4 h-4" />}
                        {verification.status === 'failed' && <XCircle className="w-4 h-4" />}
                        <span>{verification.message}</span>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex px-4 py-3">
                    <button type="submit" disabled={isSubmitting} className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 flex-1 bg-[#e92932] text-white text-sm font-bold leading-normal tracking-[0.015em] disabled:bg-red-300">
                        <span className="truncate">{isSubmitting ? 'Submitting...' : 'Submit Review'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
