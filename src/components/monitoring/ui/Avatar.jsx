

/**
 * Avatar.jsx — User avatar component
 * Menampilkan foto profil atau inisial nama.
 */

const sizeClasses = {
  xs:'w-7 h-7 text-xs',
  sm:'w-9 h-9 text-sm',
  md:'w-11 h-11 text-base',
  lg:'w-14 h-14 text-lg',
  xl:'w-20 h-20 text-2xl',
};

/**
 * @param {string} props.src - URL foto
 * @param {string} props.name - nama lengkap (untuk inisial)
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} props.size
 * @param {boolean} props.online - tampilkan dot online
 */
const Avatar = ({ src, name ='', size ='md', online, className ='' }) => {
  // Ambil inisial dari nama (maks 2 huruf)
  const initials = name
    .split('')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Warna background berdasarkan hash nama
  const colors = ['bg-[var(--ui-primary)]','bg-purple-500','bg-pink-500','bg-orange-500','bg-teal-500','bg-[var(--ui-primary)]',
  ];
  const colorIndex =
    name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-[var(--ui-radius-small)] object-cover ring-2 ring-white`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${bgColor} rounded-[var(--ui-radius-small)] flex items-center justify-center
            text-white font-bold ring-2 ring-white flex-shrink-0`}
        >
          {initials ||'?'}
        </div>
      )}

      {/* Online indicator */}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-[var(--ui-radius-small)] ring-2 ring-white
            ${online ?'bg-success' :'bg-slate-300'}`}
        />
      )}
    </div>
  );
};

export default Avatar;
