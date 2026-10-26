import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, ImagePlus, LogOut, Plus, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase.js';
import { TAGS, money, seedSample, useMenu } from '../data.js';
import { explainImageError, fileToDataUrl } from '../image.js';
import VegMark from '../components/VegMark.jsx';

/* ---------- helpers ---------- */

function useToast() {
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  const show = useCallback((m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [msg, show];
}

function explain(e) {
  if (e && e.code === 'permission-denied') return 'Permission denied. This account is not approved as an admin.';
  if (e && e.code === 'unavailable') return 'No connection. Your change was not saved.';
  return 'Could not save. Try again.';
}

async function attempt(notify, fn, okMessage) {
  try {
    await fn();
    if (okMessage) notify(okMessage);
    return true;
  } catch (e) {
    notify(explain(e));
    return false;
  }
}

function PhotoField({ label, value, onChange, notify, wide = false, max = 800 }) {
  async function pick(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await fileToDataUrl(file, max, 0.8));
    } catch (err) {
      notify(explainImageError(err));
    }
  }
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {value && (
          <img
            src={value}
            alt=""
            className={`rounded-md bg-line object-cover ${wide ? 'h-16 w-36' : 'h-[72px] w-[72px]'}`}
          />
        )}
        <label className="btn cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-accent">
          <ImagePlus size={16} />
          {value ? 'Replace photo' : 'Add photo'}
          <input type="file" accept="image/*" className="sr-only" onChange={pick} />
        </label>
        {value && (
          <button type="button" className="btn" onClick={() => onChange('')}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- dishes ---------- */

function ItemEditor({ item, categories, siblings, notify, onDeleted }) {
  const [d, setD] = useState({
    name: item.name,
    desc: item.desc || '',
    price: String(item.price ?? 0),
    categoryId: item.categoryId,
    veg: item.veg !== false,
    tags: item.tags || [],
    image: item.image || '',
  });
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!d.name.trim()) {
      notify('Every dish needs a name.');
      return;
    }
    setSaving(true);
    await attempt(
      notify,
      () =>
        updateDoc(doc(db, 'items', item.id), {
          name: d.name.trim(),
          desc: d.desc.trim(),
          price: Math.max(0, Number(d.price) || 0),
          categoryId: d.categoryId,
          veg: d.veg,
          tags: d.tags,
          image: d.image,
        }),
      'Saved',
    );
    setSaving(false);
  }

  async function move(dir) {
    const i = siblings.findIndex((s) => s.id === item.id);
    const other = siblings[i + dir];
    if (!other) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'items', item.id), { order: other.order });
    batch.update(doc(db, 'items', other.id), { order: item.order });
    await attempt(notify, () => batch.commit());
  }

  async function remove() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    const ok = await attempt(notify, () => deleteDoc(doc(db, 'items', item.id)), 'Dish deleted');
    if (ok) onDeleted();
  }

  const idx = siblings.findIndex((s) => s.id === item.id);

  return (
    <div className="grid grid-cols-1 gap-4 pb-5 pt-1 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`nm-${item.id}`} className="label">
          Name
        </label>
        <input id={`nm-${item.id}`} className="input" value={d.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`ds-${item.id}`} className="label">
          Description
        </label>
        <textarea
          id={`ds-${item.id}`}
          rows={2}
          className="input"
          value={d.desc}
          onChange={(e) => set('desc', e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <PhotoField label="Dish photo" value={d.image} onChange={(v) => set('image', v)} notify={notify} />
      </div>
      <div>
        <label htmlFor={`pr-${item.id}`} className="label">
          Price
        </label>
        <input
          id={`pr-${item.id}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          className="input"
          value={d.price}
          onChange={(e) => set('price', e.target.value)}
        />
      </div>
      <div>
        <label htmlFor={`ct-${item.id}`} className="label">
          Category
        </label>
        <select
          id={`ct-${item.id}`}
          className="input"
          value={d.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="label">Type</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name={`veg-${item.id}`} checked={d.veg} onChange={() => set('veg', true)} />
            Vegetarian
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name={`veg-${item.id}`} checked={!d.veg} onChange={() => set('veg', false)} />
            Non-vegetarian
          </label>
        </div>
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="label">Labels</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {TAGS.map((t) => (
            <label key={t} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={d.tags.includes(t)}
                onChange={(e) => set('tags', e.target.checked ? [...d.tags, t] : d.tags.filter((x) => x !== t))}
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save dish'}
        </button>
        <button type="button" className="btn" aria-label="Move up" disabled={idx <= 0} onClick={() => move(-1)}>
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          className="btn"
          aria-label="Move down"
          disabled={idx < 0 || idx >= siblings.length - 1}
          onClick={() => move(1)}
        >
          <ArrowDown size={16} />
        </button>
        <button type="button" className="btn btn-danger ml-auto" onClick={remove}>
          <Trash2 size={16} />
          {confirm ? 'Tap again to delete' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

function ItemRow({ item, categories, currency, siblings, open, onToggle, notify }) {
  const out = item.available === false;
  return (
    <section className="border-b border-line">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-3.5 text-left"
        >
          {item.image && <img src={item.image} alt="" className="h-9 w-9 flex-none rounded bg-line object-cover" />}
          <VegMark veg={item.veg} />
          <span className={`min-w-0 flex-1 break-words font-medium ${out ? 'opacity-60' : ''}`}>{item.name}</span>
          <span className="tabular-nums text-muted">{money(item.price, currency)}</span>
          <ChevronDown size={18} className={`flex-none text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <input
          type="checkbox"
          role="switch"
          className="switch"
          checked={!out}
          aria-label={`Available: ${item.name}`}
          onChange={(e) =>
            attempt(notify, () => updateDoc(doc(db, 'items', item.id), { available: e.target.checked }))
          }
        />
      </div>
      {open && (
        <ItemEditor
          key={item.id}
          item={item}
          categories={categories}
          siblings={siblings}
          notify={notify}
          onDeleted={onToggle}
        />
      )}
    </section>
  );
}

function DishesTab({ menu, notify }) {
  const { categories, items, restaurant } = menu;
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);

  if (!categories.length) {
    return <p className="py-10 text-center text-muted">Add a category first, then you can add dishes.</p>;
  }

  async function add() {
    const categoryId = filter !== 'all' ? filter : categories[0].id;
    try {
      const ref = await addDoc(collection(db, 'items'), {
        categoryId,
        name: 'New dish',
        desc: '',
        price: 0,
        veg: true,
        tags: [],
        available: true,
        image: '',
        order: Date.now(),
        createdAt: Date.now(),
      });
      setOpenId(ref.id);
    } catch (e) {
      notify(explain(e));
    }
  }

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="catFilter" className="label">
            Show
          </label>
          <select id="catFilter" className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={add}>
          <Plus size={16} />
          Add dish
        </button>
      </div>

      {categories
        .filter((c) => filter === 'all' || c.id === filter)
        .map((c) => {
          const list = items.filter((i) => i.categoryId === c.id);
          return (
            <div key={c.id}>
              <h2 className="mt-6 text-lg font-bold text-muted">{c.name}</h2>
              {list.length === 0 && <p className="py-3 text-sm text-muted">No dishes in this category yet.</p>}
              {list.map((i) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  categories={categories}
                  currency={restaurant.currency}
                  siblings={list}
                  open={openId === i.id}
                  onToggle={() => setOpenId(openId === i.id ? null : i.id)}
                  notify={notify}
                />
              ))}
            </div>
          );
        })}
    </div>
  );
}

/* ---------- categories ---------- */

function CategoryRow({ cat, index, all, count, notify }) {
  const [name, setName] = useState(cat.name);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setName(cat.name), [cat.name]);

  async function rename(e) {
    if (e) e.preventDefault();
    const n = name.trim();
    if (!n) {
      notify('A category needs a name.');
      setName(cat.name);
      return;
    }
    if (n === cat.name) return;
    await attempt(notify, () => updateDoc(doc(db, 'categories', cat.id), { name: n }), 'Renamed');
  }

  async function move(dir) {
    const other = all[index + dir];
    if (!other) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'categories', cat.id), { order: other.order });
    batch.update(doc(db, 'categories', other.id), { order: cat.order });
    await attempt(notify, () => batch.commit());
  }

  async function remove() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    await attempt(notify, () => deleteDoc(doc(db, 'categories', cat.id)), 'Category deleted');
  }

  return (
    <form onSubmit={rename} className="flex flex-wrap items-center gap-2">
      <input
        aria-label="Category name"
        className="input min-w-0 flex-[1_1_180px]"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => rename()}
      />
      <button type="button" className="btn" aria-label="Move up" disabled={index === 0} onClick={() => move(-1)}>
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        className="btn"
        aria-label="Move down"
        disabled={index === all.length - 1}
        onClick={() => move(1)}
      >
        <ArrowDown size={16} />
      </button>
      <button
        type="button"
        className="btn btn-danger"
        disabled={count > 0}
        title={count > 0 ? 'Move or delete its dishes first' : undefined}
        onClick={remove}
      >
        <Trash2 size={16} />
        {confirm ? 'Tap again' : 'Delete'}
      </button>
      <span className="text-sm text-muted">
        {count} {count === 1 ? 'dish' : 'dishes'}
      </span>
    </form>
  );
}

function CategoriesTab({ menu, notify }) {
  const { categories, items } = menu;
  const [name, setName] = useState('');

  async function add(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      notify('Type a category name first.');
      return;
    }
    const ok = await attempt(notify, () => addDoc(collection(db, 'categories'), { name: n, order: Date.now() }));
    if (ok) setName('');
  }

  return (
    <div className="mt-4 space-y-4">
      {categories.map((c, i) => (
        <CategoryRow
          key={c.id}
          cat={c}
          index={i}
          all={categories}
          count={items.filter((x) => x.categoryId === c.id).length}
          notify={notify}
        />
      ))}
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <input
          aria-label="New category name"
          className="input min-w-0 flex-[1_1_180px]"
          placeholder="New category, for example Seafood"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          <Plus size={16} />
          Add category
        </button>
      </form>
      <p className="text-sm text-muted">A category can be deleted once it has no dishes.</p>
    </div>
  );
}

/* ---------- restaurant settings ---------- */

function SettingsTab({ restaurant, notify }) {
  const [d, setD] = useState({ ...restaurant });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  async function save(e) {
    e.preventDefault();
    if (!String(d.name || '').trim()) {
      notify('Add a restaurant name.');
      return;
    }
    setSaving(true);
    await attempt(
      notify,
      () =>
        setDoc(
          doc(db, 'settings', 'restaurant'),
          {
            name: d.name.trim(),
            tagline: (d.tagline || '').trim(),
            hours: (d.hours || '').trim(),
            address: (d.address || '').trim(),
            phone: (d.phone || '').trim(),
            currency: (d.currency || '').trim() || '₹',
            showSoldOut: !!d.showSoldOut,
            cover: d.cover || '',
          },
          { merge: true },
        ),
      'Saved',
    );
    setSaving(false);
  }

  const field = (key, label, placeholder = '') => (
    <div>
      <label htmlFor={`rs-${key}`} className="label">
        {label}
      </label>
      <input
        id={`rs-${key}`}
        className="input"
        placeholder={placeholder}
        value={d[key] || ''}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <form onSubmit={save} className="mt-4 space-y-4">
      {field('name', 'Restaurant name')}
      {field('tagline', 'Tagline')}
      <PhotoField label="Cover photo" value={d.cover} onChange={(v) => set('cover', v)} notify={notify} wide max={1400} />
      {field('hours', 'Opening hours', 'Daily 11:00 AM to 11:00 PM')}
      {field('address', 'Address')}
      {field('phone', 'Phone number')}
      {field('currency', 'Currency symbol', '₹')}
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={d.showSoldOut !== false} onChange={(e) => set('showSoldOut', e.target.checked)} />
        Show sold-out dishes on the menu
      </label>
      <div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save restaurant details'}
        </button>
      </div>
    </form>
  );
}

/* ---------- page ---------- */

export default function Dashboard({ user }) {
  const menu = useMenu();
  const [tab, setTab] = useState('dishes');
  const [toast, notify] = useToast();
  const [seeding, setSeeding] = useState(false);

  const empty = menu.ready && !menu.error && menu.categories.length === 0 && menu.items.length === 0;

  const tabs = [
    ['dishes', 'Dishes'],
    ['categories', 'Categories'],
    ['restaurant', 'Restaurant'],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-bg py-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Admin</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <Link to="/" className="btn">
          <ExternalLink size={16} />
          View menu
        </Link>
        <button type="button" className="btn" onClick={() => signOut(auth)}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      <div role="tablist" className="mt-4 flex gap-1 border-b border-line">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-[3px] px-3.5 py-2.5 font-semibold ${
              tab === key ? 'border-accent text-fg' : 'border-transparent text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {menu.error && (
        <p role="alert" className="mt-6 text-danger">
          The menu could not be loaded. Check your connection and the Firestore rules, then reload.
        </p>
      )}
      {!menu.error && !menu.ready && <p className="py-10 text-center text-muted">Loading...</p>}

      {empty && (
        <div className="mt-6 rounded-md border border-line bg-surface p-4">
          <p className="font-semibold">Your menu is empty</p>
          <p className="mt-1 text-sm text-muted">
            Start with a sample menu and change it, or add your own categories and dishes.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-3"
            disabled={seeding}
            onClick={async () => {
              setSeeding(true);
              await attempt(notify, seedSample, 'Sample menu added');
              setSeeding(false);
            }}
          >
            {seeding ? 'Adding...' : 'Add sample menu'}
          </button>
        </div>
      )}

      {menu.ready && !menu.error && tab === 'dishes' && <DishesTab menu={menu} notify={notify} />}
      {menu.ready && !menu.error && tab === 'categories' && <CategoriesTab menu={menu} notify={notify} />}
      {menu.ready && !menu.error && tab === 'restaurant' && (
        <SettingsTab restaurant={menu.restaurant} notify={notify} />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-20 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md bg-fg px-4 py-2.5 text-sm font-medium text-bg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
