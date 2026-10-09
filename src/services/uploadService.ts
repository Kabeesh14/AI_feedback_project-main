import { getToken } from './apiClient';

const BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://ai-feedback-project-main.onrender.com/api' : 'http://localhost:5000/api')).replace(/\/+$/, '');

export interface UploadResult {
  url: string;
  base64: string;
  filename?: string;
  size?: number;
}

/**
 * Uploads an image file to the backend server with resilient Base64 fallback
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  // Validate file type (JPEG, PNG, WEBP allowed)
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMime.includes(file.type)) {
    throw new Error('Please select a valid image file (PNG, JPG, WEBP).');
  }

  // Validate size: 5 KB to 500 KB only
  const MIN_SIZE_BYTES = 5 * 1024; // 5 KB
  const MAX_SIZE_BYTES = 500 * 1024; // 500 KB

  if (file.size < MIN_SIZE_BYTES) {
    const sizeKb = (file.size / 1024).toFixed(1);
    throw new Error(`Image size (${sizeKb} KB) is below the minimum allowed limit of 5 KB. Please select an image between 5 KB and 500 KB.`);
  }

  if (file.size > MAX_SIZE_BYTES) {
    const sizeKb = (file.size / 1024).toFixed(1);
    throw new Error(`Image size (${sizeKb} KB) exceeds the maximum allowed limit of 500 KB. Please select an image between 5 KB and 500 KB.`);
  }

  // Generate Base64 Data URL immediately for preview & fallback
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  try {
    const formData = new FormData();
    formData.append('image', file);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data?.url) {
        const serverOrigin = BASE_URL.replace(/\/api$/, '');
        const serverUrl = data.data.url.startsWith('http')
          ? data.data.url
          : `${serverOrigin}${data.data.url}`;

        return {
          url: serverUrl,
          base64,
          filename: data.data.filename || file.name,
          size: file.size,
        };
      }
    }
  } catch (err) {
    console.warn('[uploadService] Server upload failed, using Data URL fallback:', err);
  }

  // Resilient fallback: return base64 Data URL so the submission continues smoothly
  return {
    url: base64,
    base64,
    filename: file.name,
    size: file.size,
  };
}

/**
 * Normalizes an image URL for display, ensuring relative paths are prefixed with the backend server origin
 */
export function getFullImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const serverOrigin = BASE_URL.replace(/\/api$/, '');
  return `${serverOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}
