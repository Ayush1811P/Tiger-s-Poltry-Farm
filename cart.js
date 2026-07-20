// Cart store — single source of truth for the order.
// Each line item references a product id and stores the chosen
// unit (piece/weight) and quantity, so the catalog can change
// without breaking saved carts.

import { products, business } from "./data.js";

const KEY = "tpf_cart_v1";

function load() {
    try {
        localStorage.removeItem(KEY);
        return [];
    } catch {
        return [];
    }
}

function save(items) {
    try {
        localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
        /* ignore quota errors */
    }
}

// Simple pub/sub so the UI can re-render on change.
const listeners = new Set();
export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
function emit() {
    listeners.forEach((fn) => fn(state));
}

let state = {
    items: load(), // [{ id, unit, qty }]  qty = pieces OR kg
};

export function getState() {
    return state;
}

export function addItem(productId, unit, qty = 1) {
    const product = products.find((p) => p.id === productId);
    if (!product || !product.stock) return;
    const existing = state.items.find((i) => i.id === productId && i.unit === unit);
    let next;
    if (existing) {
        next = state.items.map((i) =>
            i === existing ? { ...i, qty: round(i.qty + qty) } : i
        );
    } else {
        next = [...state.items, { id: productId, unit, qty: round(qty) }];
    }
    state = { items: next };
    save(next);
    emit();
}

export function setQty(productId, unit, qty) {
    const q = round(qty);
    let next;
    if (q <= 0) {
        next = state.items.filter((i) => !(i.id === productId && i.unit === unit));
    } else {
        next = state.items.map((i) =>
            i.id === productId && i.unit === unit ? { ...i, qty: q } : i
        );
    }
    state = { items: next };
    save(next);
    emit();
}

export function removeItem(productId, unit) {
    const next = state.items.filter(
        (i) => !(i.id === productId && i.unit === unit)
    );
    state = { items: next };
    save(next);
    emit();
}

export function clearCart() {
    state = { items: [] };
    save([]);
    emit();
}

function round(n) {
    return Math.round(n * 1000) / 1000;
}

// Price helpers ---------------------------------------------------

export function lineTotal(item) {
    const product = products.find((p) => p.id === item.id);
    if (!product) return 0;
    const price = product.unit === "piece" ? product.pricePerPiece : product.pricePerKg;
    return Math.round(price * item.qty * 100) / 100;
}

export function subtotal() {
    return state.items.reduce((sum, i) => sum + lineTotal(i), 0);
}

export function total() {
    return subtotal();
}

export function itemCount() {
    return state.items.reduce((n, i) => n + (i.weightPerPiece ? i.pcs : (i.unit === "piece" ? i.qty : 1)), 0);
}

export function addCustomItem(productId, weightPerPiece, pcs) {
    const product = products.find((p) => p.id === productId);
    if (!product || !product.stock) return;
    const existing = state.items.find((i) => i.id === productId && i.weightPerPiece === weightPerPiece);
    let next;
    if (existing) {
        next = state.items.map((i) =>
            i === existing ? { ...i, pcs: i.pcs + pcs, qty: round((i.pcs + pcs) * weightPerPiece) } : i
        );
    } else {
        next = [...state.items, { id: productId, unit: "weight", weightPerPiece, pcs, qty: round(pcs * weightPerPiece) }];
    }
    state = { items: next };
    save(next);
    emit();
}

export function setCustomQty(productId, weightPerPiece, pcs) {
    let next;
    if (pcs <= 0) {
        next = state.items.filter((i) => !(i.id === productId && i.weightPerPiece === weightPerPiece));
    } else {
        next = state.items.map((i) =>
            i.id === productId && i.weightPerPiece === weightPerPiece ? { ...i, pcs: pcs, qty: round(pcs * weightPerPiece) } : i
        );
    }
    state = { items: next };
    save(next);
    emit();
}

export function removeCustomItem(productId, weightPerPiece) {
    const next = state.items.filter((i) => !(i.id === productId && i.weightPerPiece === weightPerPiece));
    state = { items: next };
    save(next);
    emit();
}

