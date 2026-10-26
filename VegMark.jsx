// The green or red square-and-dot mark used on Indian menus.
export default function VegMark({ veg }) {
  return (
    <span
      role="img"
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`relative inline-block h-4 w-4 flex-none self-center rounded-[3px] border-2 border-current ${
        veg ? 'text-veg' : 'text-nonveg'
      }`}
    >
      <span className="absolute inset-0.5 rounded-full bg-current" />
    </span>
  );
}
