/**
 * Avatar.jsx — User avatar component
 * Menampilkan foto profil atau inisial nama dengan skema warna yang elegan.
 */

const sizeClasses = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

/**
 * @param {string} props.src - URL foto
 * @param {string} props.name - nama lengkap (untuk inisial)
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} props.size
 * @param {boolean} props.online - tampilkan dot online
 */
const Avatar = ({ src, name = '', size = 'md', online, className = '' }) => {
  // Ambil inisial dari kata dalam nama (maksimal 2 huruf pertama dari 2 kata pertama)
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  let initials = '?';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    initials = words[0].slice(0, 2).toUpperCase();
  } else if (words.length === 1) {
    initials = words[0][0].toUpperCase();
  }

  // Warna background elegan berdasarkan hash nama (cohesive palette)
  const colors = [
    'bg-emerald-600 text-white',
    'bg-teal-600 text-white',
    'bg-indigo-600 text-white',
    'bg-sky-600 text-white',
    'bg-slate-700 text-white',
    'bg-purple-600 text-white',
  ];
  const colorIndex =
    String(name).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const colorStyle = colors[colorIndex];

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-[var(--ui-radius-small)] object-cover ring-2 ring-white shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${colorStyle} rounded-[var(--ui-radius-small)] flex items-center justify-center
            font-bold ring-2 ring-white flex-shrink-0 shadow-2xs tracking-tight`}
        >
          {initials}
        </div>
      )}

      {/* Online indicator */}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white
            ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
        />
      )}
    </div>
  );
};

export default Avatar;
