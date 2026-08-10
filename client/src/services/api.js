const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5280/api';

// Sunucudan gelen hataları (JSON, ProblemDetails veya Düz Metin) güvenle çözen yardımcı fonksiyon
const parseApiError = async (response, fallbackMessage) => {
  try {
    const text = await response.text();
    if (!text) return fallbackMessage;

    try {
      const data = JSON.parse(text);
      if (data.message) return data.message;
      if (data.title) return data.title;
      if (data.detail) return data.detail;
      if (data.errors && typeof data.errors === 'object') {
        const firstErrorKey = Object.keys(data.errors)[0];
        if (firstErrorKey && data.errors[firstErrorKey][0]) {
          return data.errors[firstErrorKey][0];
        }
      }
      return fallbackMessage;
    } catch {
      return text || fallbackMessage;
    }
  } catch {
    return fallbackMessage;
  }
};

// Kabin Listesini Getir
export const getCabins = async () => {
  const response = await fetch(`${API_BASE_URL}/cabins`);
  if (!response.ok) {
    const errorMessage = await parseApiError(response, 'Kabin listesi sunucudan alınamadı.');
    throw new Error(errorMessage);
  }
  return await response.json();
};

// Kayıtlı Konfigürasyonları Getir
export const getConfigurations = async () => {
  const response = await fetch(`${API_BASE_URL}/configurations`);
  if (!response.ok) {
    const errorMessage = await parseApiError(response, 'Kayıtlı projeler alınamadı.');
    throw new Error(errorMessage);
  }
  return await response.json();
};

// Yeni Konfigürasyon Kaydet
export const saveConfiguration = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/configurations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response, 'Konfigürasyon kaydedilirken bir hata oluştu.');
    throw new Error(errorMessage);
  }

  return await response.json();
};

// Konfigürasyon Sil (DELETE - 204 No Content Korumalı)
export const deleteConfiguration = async (id) => {
  const response = await fetch(`${API_BASE_URL}/configurations/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response, 'Konfigürasyon silinemedi.');
    throw new Error(errorMessage);
  }

  // 204 No Content veya boş yanıt durumunda JSON parse etmeden başarılı dön
  if (response.status === 204) {
    return { success: true };
  }

  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

// Kayıtlı Projenin PDF'ini İndir
export const downloadProjectPdfBlob = async (id) => {
  const response = await fetch(`${API_BASE_URL}/configurations/${id}/pdf`);
  
  if (!response.ok) {
    const errorMessage = await parseApiError(response, 'Kayıtlı proje PDF\'i indirilemedi.');
    throw new Error(errorMessage);
  }

  return await response.blob();
};

// Canlı Ekranda Kaydedilmemiş Taslak PDF'ini İndir
export const exportDraftPdfBlob = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/configurations/export-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response, 'Taslak PDF oluşturulamadı.');
    throw new Error(errorMessage);
  }

  return await response.blob();
};