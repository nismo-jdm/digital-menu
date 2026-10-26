import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { configured } from '../firebase.js';
import { money, useMenu } from '../data.js';
import VegMark from '../components/VegMark.jsx';
import SetupNotice from '../components/SetupNotice.jsx';

function Dish({ item, currency }) {
  const out = item.available === false;
  return (
    <article className={`flex items-start gap-3.5 border-b border-line py-3.5 ${out ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5">
          <VegMark veg={item.veg} />
          <h3 className="min-w-0 text-lg font-medium leading-snug">{item.name}</h3>
          <span aria-hidden="true" className="min-w-3 flex-1 border-b-2 border-dotted border-line" />
          <span className={`whitespace-nowrap font-semibold tabular-nums ${out ? 'line-through' : ''}`}>
            {money(item.price, currency)}
          </span>
        </div>
        {item.desc && <p className="mt-1 max-w-prose pl-[26px] text-[15px] text-muted">{item.desc}</p>}
        {((item.tags && item.tags.length > 0) || out) && (
          <div className="mt-2 flex flex-wrap gap-1.5 pl-[26px]">
            {(item.tags || []).map((t) => (
              <span key={t} className="badge border-gold text-gold">
                {t}
              </span>
            ))}
            {out && <span className="badge border-danger text-danger">Sold out</span>}
          </div>
        )}
      </div>
      {item.image && (
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className={`h-20 w-20 flex-none rounded-md bg-line object-cover sm:h-24 sm:w-24 ${out ? 'grayscale' : ''}`}
        />
      )}
    </article>
  );
}

export default function Menu() {
  const { ready, error, restaurant: r, categories, items } = useMenu();
  const [q, setQ] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    return categories
      .map((c) => ({
        c,
        list: items.filter(
          (i) =>
            i.categoryId === c.id &&
            (r.showSoldOut !== false || i.available !== false) &&
            (!vegOnly || i.veg) &&
            (!term || `${i.name} ${i.desc || ''}`.toLowerCase().includes(term)),
        ),
      }))
      .filter((s) => s.list.length > 0);
  }, [categories, items, q, vegOnly, r.showSoldOut]);

  if (!configured) return <SetupNotice />;

  function jump(id) {
    const el = document.getElementById(`sec-${id}`);
    if (!el) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  }

  const info = [r.hours, r.address, r.phone].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      {r.cover && <img src={r.cover} alt="" className="mb-5 aspect-[16/7] w-full rounded-md bg-line object-cover" />}

      <header>
        <h1 className="text-[clamp(2.1rem,8vw,3.4rem)] font-bold leading-none tracking-tight">{r.name}</h1>
        {r.tagline && <p className="mt-2 text-lg text-muted">{r.tagline}</p>}
        {info.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-0.5 text-sm text-muted">
            {info.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
        )}
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-[1_1_220px]">
          <span className="sr-only">Search dishes</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dishes"
            autoComplete="off"
            className="input pl-10"
          />
        </label>
        <button
          type="button"
          aria-pressed={vegOnly}
          onClick={() => setVegOnly((v) => !v)}
          className={`chip ${vegOnly ? 'border-accent bg-accent text-accent-fg' : ''}`}
        >
          <VegMark veg />
          Veg only
        </button>
      </div>

      {sections.length > 0 && (
        <nav
          aria-label="Categories"
          className="sticky top-0 z-10 -mx-4 mt-2 flex gap-2 overflow-x-auto border-b border-line bg-bg px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sections.map(({ c }) => (
            <button key={c.id} type="button" className="chip" onClick={() => jump(c.id)}>
              {c.name}
            </button>
          ))}
        </nav>
      )}

      <main>
        {error && (
          <p className="py-12 text-center text-muted">
            The menu could not be loaded. Check your connection and try again.
          </p>
        )}
        {!error && !ready && <p className="py-12 text-center text-muted">Loading the menu...</p>}
        {!error && ready && sections.length === 0 && (
          <p className="py-12 text-center text-muted">
            {items.length ? 'No dishes match your search.' : 'The menu is being prepared. Please check back soon.'}
          </p>
        )}
        {sections.map(({ c, list }) => (
          <section key={c.id} id={`sec-${c.id}`} className="scroll-mt-16 pt-7">
            <h2 className="flex items-baseline gap-2.5 text-2xl font-bold tracking-tight">
              {c.name}
              <small className="font-body text-[13px] font-medium text-muted">
                {list.length} {list.length === 1 ? 'dish' : 'dishes'}
              </small>
            </h2>
            {list.map((i) => (
              <Dish key={i.id} item={i} currency={r.currency} />
            ))}
          </section>
        ))}
      </main>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
        <p>Prices in {r.currency || 'local currency'}. A red mark means the dish contains meat, fish or egg.</p>
        <Link to="/admin" className="underline">
          Staff login
        </Link>
      </footer>
    </div>
  );
}
