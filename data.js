// Product catalog and offers data.
// In the future, this can be replaced by Supabase queries without
// changing the rendering code — the shape stays the same.

export const products = [
    {
        id: "whole-chicken",
        name: { en: "Whole Chicken", hi: "साबुत चिकन" },
        originalPricePerKg: 240,
        pricePerKg: 220,
        unit: "weight",
        stock: true,
        image: "/chicken_pic.jpg",
        desc: { en: "Select your preferred weight per chicken (1.0 kg - 2.0 kg) and quantity to customize your order.", hi: "अपना ऑर्डर कस्टमाइज़ करने के लिए प्रति चिकन मनपसंद वज़न (1.0 किलो - 2.0 किलो) और मात्रा चुनें।" },
    },
];

export const offers = [
    {
        id: "offer-1",
        title: { en: "Bulk Order Discount", hi: "थोक ऑर्डर छूट" },
        body: { en: "Order 5 kg or more and get 10% off on whole chicken.", hi: "5 किलो या ज़्यादा ऑर्डर पर साबुत चिकन पर 10% छूट पाएं।" },
        badge: { en: "10% OFF", hi: "10% छूट" },
    },
    {
        id: "offer-2",
        title: { en: "Free Home Delivery", hi: "मुफ़्त होम डिलीवरी" },
        body: { en: "Free delivery on all orders above ₹500 within the city.", hi: "शहर के अंदर ₹500 से ज़्यादा के सभी ऑर्डर पर मुफ़्त डिलीवरी।" },
        badge: { en: "FREE", hi: "मुफ़्त" },
    },
];

export const galleryImages = [
    "/galary_1.jpg",
    "/galary_2.jpg",
    "/chicken_pic.jpg",
    "/about_image.jpg",
    "/about_2.jpg",
];

// Business contact details.
export const business = {
    phone: "9313222913",
    email: "awsmsi0300@gmail.com",
    whatsappNumber: "919313222913", // with country code, no +
    upiId: "YOUR_UPI_ID_HERE", // IMPORTANT: Replace this with actual UPI ID
    freeDeliveryThreshold: 500,
    deliveryFee: 40,
};
