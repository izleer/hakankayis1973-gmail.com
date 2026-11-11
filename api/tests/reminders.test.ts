import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

const { reminderMessage, REMINDER_MESSAGE_FALLBACK_KEY, REMINDER_MESSAGE_KEY } = await import(
  '../src/lib/reminders.js'
);

describe('hatırlatma bildirimi metni', () => {
  it('başlığı ve varlık adını kullanır', () => {
    const message = reminderMessage('Bonsai', 'Toprak değişimi', null);
    expect(message.key).toBe(REMINDER_MESSAGE_KEY);
    expect(message.params).toEqual({ asset: 'Bonsai', title: 'Toprak değişimi' });
    expect(message.text).toContain('Bonsai');
    expect(message.text).toContain('Toprak değişimi');
  });

  it('başlık yoksa notun ilk bölümünü kullanır', () => {
    const message = reminderMessage('Bonsai', '  ', 'Kökler   kontrol edilecek ve teller gevşetilecek.');
    expect(message.key).toBe(REMINDER_MESSAGE_KEY);
    expect(message.params.title).toBe('Kökler kontrol edilecek ve teller gevşetilecek.');
  });

  it('başlık ve not yoksa yalnızca varlık adıyla sade metne düşer', () => {
    const message = reminderMessage('Bonsai', null, '   ');
    expect(message.key).toBe(REMINDER_MESSAGE_FALLBACK_KEY);
    expect(message.params).toEqual({ asset: 'Bonsai' });
    expect(message.text).toContain('Bonsai');
  });
});
