import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore';
import { db } from './firebase.js';

export const DEFAULT_RESTAURANT = {
  name: 'Your Restaurant',
  tagline: '',
  hours: '',
  address: '',
  phone: '',
  currency: '₹',
  showSoldOut: true,
  cover: '',
};

export const TAGS = ['Spicy', "Chef's pick", 'Popular'];

export function money(n, currency = '₹') {
  return `${currency || ''}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Live menu data. Everything updates on its own when an admin changes something.
export function useMenu() {
  const [state, setState] = useState({
    ready: false,
    error: null,
    restaurant: DEFAULT_RESTAURANT,
    categories: [],
    items: [],
  });

  useEffect(() => {
    if (!db) return undefined;
    const seen = { r: false, c: false, i: false };
    const patch = (key, part) => {
      seen[key] = true;
      setState((prev) => ({ ...prev, ...part, ready: seen.r && seen.c && seen.i }));
    };
    const fail = (error) => setState((prev) => ({ ...prev, error, ready: true }));

    const stopSettings = onSnapshot(
      doc(db, 'settings', 'restaurant'),
      (snap) => patch('r', { restaurant: { ...DEFAULT_RESTAURANT, ...(snap.exists() ? snap.data() : {}) } }),
      fail,
    );
    const stopCategories = onSnapshot(
      query(collection(db, 'categories'), orderBy('order')),
      (snap) => patch('c', { categories: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
      fail,
    );
    const stopItems = onSnapshot(
      query(collection(db, 'items'), orderBy('order')),
      (snap) => patch('i', { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
      fail,
    );
    return () => {
      stopSettings();
      stopCategories();
      stopItems();
    };
  }, []);

  return state;
}

const SAMPLE = [
  {
    name: 'Starters',
    items: [
      { name: 'Chicken 65', desc: 'Crisp fried chicken tossed with curry leaf, green chilli and ginger.', price: 180, veg: false, tags: ['Spicy', 'Popular'] },
      { name: 'Gobi Manchurian', desc: 'Cauliflower florets in a sticky garlic and soy glaze.', price: 140, veg: true },
    ],
  },
  {
    name: 'Biryani & Rice',
    items: [
      { name: 'Kozhikodan Chicken Biryani', desc: 'Jeerakasala rice layered with spiced chicken, fried onion and ghee.', price: 220, veg: false, tags: ["Chef's pick", 'Popular'] },
      { name: 'Vegetable Biryani', desc: 'Seasonal vegetables and cashew in fragrant dum rice.', price: 160, veg: true },
      { name: 'Ghee Rice', desc: 'Fragrant rice with roasted cashew and raisins.', price: 90, veg: true },
    ],
  },
  {
    name: 'Curries & Breads',
    items: [
      { name: 'Kerala Parotta (2 pcs)', desc: 'Flaky layered flatbread cooked on the tawa.', price: 40, veg: true, tags: ['Popular'] },
      { name: 'Nadan Chicken Curry', desc: 'Home-style curry with coconut oil, black pepper and curry leaves.', price: 150, veg: false, tags: ['Spicy'] },
      { name: 'Egg Roast', desc: 'Boiled eggs in a slow-cooked onion and tomato masala.', price: 110, veg: false },
      { name: 'Vegetable Stew', desc: 'Potato, carrot and beans in light coconut milk.', price: 120, veg: true },
    ],
  },
  {
    name: 'Drinks',
    items: [
      { name: 'Sulaimani Tea', desc: 'Black tea with lemon, cardamom and clove.', price: 20, veg: true },
      { name: 'Fresh Lime Soda', desc: 'Sweet, salted or mixed.', price: 40, veg: true },
      { name: 'Spiced Buttermilk', desc: 'Churned curd with ginger, green chilli and curry leaf.', price: 30, veg: true },
    ],
  },
  {
    name: 'Desserts',
    items: [
      { name: 'Pazham Pori', desc: 'Ripe banana fritters, fried golden.', price: 30, veg: true, tags: ['Popular'] },
      { name: 'Elaneer Payasam', desc: 'Tender coconut and milk pudding.', price: 70, veg: true, available: false },
    ],
  },
];

// Fills an empty menu with example dishes. Only works while signed in as an admin.
export async function seedSample() {
  const batch = writeBatch(db);
  let order = 1;
  SAMPLE.forEach((cat, n) => {
    const catRef = doc(collection(db, 'categories'));
    batch.set(catRef, { name: cat.name, order: n + 1 });
    cat.items.forEach((it) => {
      batch.set(doc(collection(db, 'items')), {
        categoryId: catRef.id,
        name: it.name,
        desc: it.desc,
        price: it.price,
        veg: it.veg,
        tags: it.tags || [],
        available: it.available !== false,
        image: '',
        order: order++,
        createdAt: Date.now(),
      });
    });
  });
  batch.set(
    doc(db, 'settings', 'restaurant'),
    {
      ...DEFAULT_RESTAURANT,
      name: 'Malabar Kitchen',
      tagline: 'Coastal Kerala cooking, served all day.',
      hours: 'Daily 11:00 AM to 11:00 PM',
    },
    { merge: true },
  );
  await batch.commit();
}
