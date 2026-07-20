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
        image: "/chicken_pic.webp",
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
        title: { en: "Single Bird Discount", hi: "सिंगल बर्ड छूट" },
        body: { en: "Enjoy an exclusive 8% discount on every individual whole chicken purchase.", hi: "प्रत्येक साबुत चिकन की खरीदारी पर 8% की विशेष छूट का आनंद लें।" },
        badge: { en: "8% OFF", hi: "8% छूट" },
    },
];

export const galleryImages = [
    "/galary_1.webp",
    "/galary_2.webp",
    "/chicken_pic.webp",
    "/about_image.webp",
    "/about_2.webp",
];

// Business contact details.
export const business = {
    phone: "7007305113",
    email: "awsmsi0300@gmail.com",
    whatsappNumber: "7007305113", // with country code, no +
    upiId: "9839376102@ptsbi", // IMPORTANT: Replace this with actual UPI ID
};
