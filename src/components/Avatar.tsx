import { useState } from 'react';

interface AvatarProps {
  /** Public CDN photo URL (Supabase / Firebase / Google). Empty / missing
   *  values fall back to a coloured initials chip. */
  photoUrl?: string | null;
  /** Display name; first letter is used for the initials fallback. */
  name?: string | null;
  /** Pixel size — same value used for width and height. */
  size?: number;
  className?: string;
}

const PALETTE = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-fuchsia-100 text-fuchsia-700',
];

function paletteIndex(seed: string): number {
  if (!seed) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE.length;
}

export default function Avatar({
  photoUrl,
  name,
  size = 36,
  className = '',
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const initial =
    (name ?? '').trim().length > 0
      ? (name as string).trim()[0].toUpperCase()
      : '?';
  const tone = PALETTE[paletteIndex(name ?? '')];

  if (photoUrl && !errored) {
    return (
      <img
        src={photoUrl}
        alt={name ?? ''}
        onError={() => setErrored(true)}
        className={`rounded-full object-cover bg-gray-100 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full grid place-items-center font-bold ${tone} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.42) }}
    >
      {initial}
    </div>
  );
}
