'use client';

import { useState, useRef, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createRfq, CreateRfqPayload } from '@/lib/api';
import { PAKISTAN_CITIES } from '@/lib/cities';
import { useLanguage } from '@/contexts/LanguageContext';

// Demo buyer — in production this would come from an auth context
const DEMO_BUYER_ID = 'a1000000-0000-0000-0000-000000000001';

// Voice recognition – typed as generic constructor to avoid TypeScript DOM lib dependency
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: new () => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: new () => any;
  }
}

export default function NewRfqPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<Omit<CreateRfqPayload, 'buyer_id'>>({
    product_name: '',
    quantity: 1,
    city: '',
    description: '',
    images: [],
  });

  const [imageInput, setImageInput] = useState('');

  // Voice input state
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'quantity' ? Number(value) : value }));
  };

  const addImage = () => {
    const url = imageInput.trim();
    if (url) {
      setForm((prev) => ({ ...prev, images: [...(prev.images ?? []), url] }));
      setImageInput('');
    }
  };

  const removeImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      images: (prev.images ?? []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const rfq = await createRfq({ ...form, buyer_id: DEMO_BUYER_ID });
      router.push(`/rfq/${rfq.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('error_generic');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Voice input handler
  const handleVoiceInput = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      return;
    }

    if (voiceListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SR();
    recognition.lang = lang === 'ur' ? 'ur-PK' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setVoiceListening(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setForm((prev) => ({ ...prev, product_name: transcript }));
    };

    recognition.onend = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [voiceListening, lang]);

  return (
    <main className="page-container">
      <div className="form-card">
        <h1 className="page-title">{t('rfq_form_title')}</h1>
        <p className="page-subtitle">{t('rfq_form_subtitle')}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="rfq-form">
          {/* Product name + voice input */}
          <div className="field">
            <label htmlFor="product_name">{t('rfq_product_label')}</label>
            <div className="voice-row">
              <input
                id="product_name"
                name="product_name"
                type="text"
                required
                placeholder={t('rfq_product_placeholder')}
                value={form.product_name}
                onChange={handleChange}
                style={{ flex: 1 }}
              />
              {voiceSupported ? (
                <button
                  type="button"
                  className={`voice-btn${voiceListening ? ' recording' : ''}`}
                  onClick={handleVoiceInput}
                  title={voiceListening ? t('rfq_voice_stop') : t('rfq_voice_start')}
                  aria-label={voiceListening ? t('rfq_voice_stop') : t('rfq_voice_start')}
                >
                  {voiceListening ? t('rfq_voice_stop') : t('rfq_voice_start')}
                </button>
              ) : (
                <span className="voice-status">{t('rfq_voice_not_supported')}</span>
              )}
            </div>
            {voiceListening && (
              <p className="voice-status">{t('rfq_voice_listening')}</p>
            )}
          </div>

          {/* Quantity */}
          <div className="field">
            <label htmlFor="quantity">{t('rfq_quantity_label')}</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              required
              min={1}
              inputMode="numeric"
              value={form.quantity}
              onChange={handleChange}
            />
          </div>

          {/* City – Pakistan city select */}
          <div className="field">
            <label htmlFor="city">{t('rfq_city_label')}</label>
            <select
              id="city"
              name="city"
              required
              value={form.city}
              onChange={handleChange}
            >
              <option value="">{t('city_select_prompt')}</option>
              {PAKISTAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="field">
            <label htmlFor="description">{t('rfq_description_label')}</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder={t('rfq_description_placeholder')}
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* Images */}
          <div className="field">
            <label>{t('rfq_images_label')}</label>
            <div className="image-input-row">
              <input
                type="url"
                placeholder={t('rfq_image_placeholder')}
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addImage(); }
                }}
              />
              <button type="button" className="btn-secondary" onClick={addImage}>
                {t('rfq_image_add')}
              </button>
            </div>
            {(form.images ?? []).length > 0 && (
              <ul className="image-list">
                {(form.images ?? []).map((url, idx) => (
                  <li key={idx}>
                    <span className="image-url">{url}</span>
                    <button type="button" className="btn-remove" onClick={() => removeImage(idx)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" className="btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? t('rfq_submitting') : t('rfq_submit')}
          </button>
        </form>
      </div>
    </main>
  );
}
