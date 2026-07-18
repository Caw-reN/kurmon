

export const compressImage = (file, { maxWidth = 1000, maxHeight = 1000, quality = 0.8, type = 'image/webp' } = {}) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    if (!file.type.startsWith('image/')) return resolve(file); // Don't compress non-images

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Determine the best output type. If it's a PNG, keep it PNG to preserve transparency.
        const outputType = type || (file.type === 'image/png' || file.type === 'image/svg+xml' ? 'image/png' : 'image/webp');
        
        // Convert back to base64
        const compressedBase64 = canvas.toDataURL(outputType, quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
