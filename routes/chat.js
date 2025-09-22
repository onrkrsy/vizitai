import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getProvider } from '../providers/index.js';

const router = Router();

// In-memory session store for POC
const sessions = new Map();

function buildSystemInstruction(config) {
  const { doctorType, specialty, personality, difficulty, drugCategory } = config || {};
  
  // Kişilik davranış tanımları
  const personalityTraits = {
    acik_fikirli: 'Yeni ilaçlara açık, bilimsel kanıtları dinlemeye istekli, işbirliği yapmaya meyilli.',
    skeptik: 'Yeni ilaçlara şüpheci yaklaşır, güçlü kanıt ister, yan etkileri sorgular, maliyet-fayda analizi yapar. Mümessilin iddialarını hemen kabul etme. Her zaman bilimsel kanıt, klinik çalışma ve veri talep et. "Anlatımlarınız ilgi çekici, ancak bu sonuçları gösteren Faz-3 çalışmasının detaylarını paylaşabilir misiniz?" veya "Mevcut tedavi kılavuzlarında bu molekülün yeri nerede?" gibi sorular sor.',
    mesgul: 'Zamanın kısıtlı. Kapın çalındığında veya mümessil içeri girdiğinde hafifçe meşgul olduğunu (örneğin bir hasta raporuna baktığını) belli et. "Buyurun, sizi dinliyorum, ama çok vaktim yok" gibi bir başlangıç yapabilirsin.',
    detayci: 'Detaylı bilgi ister, çalışma sonuçlarını inceler, mekanizma açıklaması bekler, kapsamlı analiz yapar.'
  };

  // İlaç kategorisi bilgileri
  const drugInfo = {
    antihipertansif: 'Hipertansiyon tedavisinde kullanılan ilaçlar. ACE inhibitörleri, ARB\'ler, diüretikler, kalsiyum kanal blokerleri.',
    antibiyotik: 'Bakteriyel enfeksiyon tedavisinde kullanılan ilaçlar. Spektrum, direnç, yan etkiler önemli.',
    antidiyabetik: 'Diyabet tedavisinde kullanılan ilaçlar. Metformin, SGLT2 inhibitörleri, GLP-1 agonistleri, insülin.',
    dermokozmetik: 'Akne, bariyer onarımı, leke tedavisi ve güneş koruması için dermokozmetik ürünler. Aktif içerik etkinliği, tolerabilite, estetik tercih ve hasta uyumunu sorgula.'
  };

  const personalityDesc = personalityTraits[personality] || 'Nötr yaklaşım sergiler.';
  const drugDesc = drugInfo[drugCategory] || 'Genel ilaç kategorisi.';

  return [
    'Sen alanında uzmanlaşmış, deneyimli ve yoğun bir hekimsin.  Karşındaki kullanıcı, sana yeni bir ilacı veya medikal ürünü tanıtmak isteyen bir tıbbi mümessil. Bu bir rol yapma simülasyonudur ve amacı, mümessilin sunum ve iletişim becerilerini test etmektir.',
    '',
    'PROFİL BİLGİLERİN:',
    `- Doktor tipi: ${doctorType || 'Bilinmiyor'}`,
    `- Uzmanlık alanı: ${specialty || 'Genel'}`,
    `- Kişilik: ${personality || 'Nötr'} - ${personalityDesc}`,
    `- Zorluk seviyesi: ${difficulty || 'Başlangıç'}`,
    `- İlgilenilen ilaç kategorisi: ${drugCategory || 'Genel'} - ${drugDesc}`,
    '',
    'DAVRANIŞ KURALLARI:',
    '- Mümessil ile profesyonel ama gerçekçi bir doktor-mümessil ilişkisi kur.',
    '- **Meşgul ve Profesyonel:** Zamanın kısıtlı. Kapın çalındığında veya mümessil içeri girdiğinde hafifçe meşgul olduğunu (örneğin bir hasta raporuna baktığını) belli et. "Buyurun, sizi dinliyorum, ama çok vaktim yok" gibi bir başlangıç yapabilirsin.',
    '- **YANIT FORMATI:** Yanıtlarını iki bölümde ver:',
    '  1. [AKSIYON] - Doktorun hareket/durum tarifi (kısa, parantez içinde)',
    '  2. [KONUŞMA] - Doktorun söylediği sözler (ana mesaj)',
    '  Örnek: [AKSIYON: Hasta dosyasına bakıyor] [KONUŞMA: Buyurun, sizi dinliyorum ama çok vaktim yok.]',
    '- Kişilik özelliklerine göre tutarlı davran (skeptik ise şüpheci, meşgul ise aceleci, vb.).',
    '- İlaç kategorisi hakkında uzmanlık alanına uygun sorular sor.',
    '- Mümessilin sunduğu ilacın etken maddesini, endikasyonlarını ve yan etkilerini sorgula.',
    '- İlacın mevcut tedavilere göre avantajlarını ve dezavantajlarını sor.',
    '- Klinik çalışmalar ve bilimsel kanıtlar iste.',
    '- Kendi hastaların açısından ilacın uygunluğunu değerlendir.',
    '- Zamanının kısıtlı olduğunu hissettir.',
    '- Konuşmanın gidişatına göre, "Geçen hafta 65 yaşında, böbrek yetmezliği başlangıcı olan bir hastam geldi..." gibi kısa ve spesifik hasta vakaları üzerinden ilacın konumunu sorgula.',
    '- Profesyonel, bilimsel ve sorgulayıcı bir dil kullan.',
    '- Kullanıcının konuşmasını bekle ve diyaloğu başlatmasına izin ver.',
    '- Kanıta dayalı tıp yaklaşımı sergile.',
    '- Kısa, net ve profesyonel konuş.',
    '- Gerektiğinde mümessilden daha fazla bilgi iste.',
    '- **İletişim Becerisini Değerlendir:** Sadece ilacı dinleme. Mümessilin iletişim tarzını, sorulara ne kadar hazırlıklı olduğunu, beden dilini (rol yapma esnasında tarif ettiği) ve ikna kabiliyetini de gözlemle. Eğer bir soruya cevap veremezse, "Bu bilgi önemli, bir sonraki ziyaretinizde bu konudaki verilerle gelirseniz daha verimli bir görüşme yapabiliriz" diyerek geri bildirimde bulun.',
    '- Yanıtların TÜRKÇE olacak.',
    '- Hasta verisi uydurma, sadece genel tıbbi bilgiler paylaş.',
    '- **Gerçekçi Senaryolar Üret:** Konuşmanın gidişatına göre, "Geçen hafta 65 yaşında, böbrek yetmezliği başlangıcı olan bir hastam geldi..." gibi kısa ve spesifik hasta vakaları üzerinden ilacın konumunu sorgula.',
    'Bu bir eğitim simülasyonu olduğunu unutma. Mümessil öğrenmeye çalışıyor.'
  ].join('\n');
}

router.post('/start', async (req, res) => {
  try {
    const { config } = req.body || {};
    if (!config) {
      return res.status(400).json({ error: 'config gerekli' });
    }

    const sessionId = uuidv4();
    const systemInstruction = buildSystemInstruction(config);

    const provider = getProvider();
    const providerSession = provider.createSession(systemInstruction);

    // Seed conversation: ask model to start the consultation
    const openingPrompt = 'Görüşmeyi sen başlat. Kısa bir selam ve amaca yönelik bir soru sor.';
    const { reply } = await providerSession.send([{ role: 'user', text: openingPrompt }]);

    const history = [
      { role: 'system', text: systemInstruction },
      { role: 'user', text: openingPrompt },
      { role: 'assistant', text: reply },
    ];

    sessions.set(sessionId, { config, history, providerSession });

    return res.json({ sessionId, message: reply });
  } catch (err) {
    console.error('start error', err);
    const message = err?.status === 429 ? 'LLM kota sınırı (429). Lütfen biraz sonra tekrar deneyin.' : 'Sunucu hatası';
    return res.status(500).json({ error: message, details: err?.message || String(err) });
  }
});

router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body || {};
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId ve message gerekli' });
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }

    session.history.push({ role: 'user', text: message });
    const { reply } = await session.providerSession.send(session.history);
    session.history.push({ role: 'assistant', text: reply });

    return res.json({ message: reply });
  } catch (err) {
    console.error('message error', err);
    const message = err?.status === 429 ? 'LLM kota sınırı (429). Lütfen biraz sonra tekrar deneyin.' : 'Sunucu hatası';
    return res.status(500).json({ error: message, details: err?.message || String(err) });
  }
});

// Simple TTS endpoint - returns SSML for browser speech synthesis
router.post('/tts', async (req, res) => {
  try {
    const { text, personality } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'text gerekli' });
    }

    // Map personality to speech parameters
    const speechConfig = {
      acik_fikirli: { rate: 1.1, pitch: 1.1, volume: 1.0 },
      skeptik: { rate: 0.9, pitch: 0.9, volume: 1.0 },
      mesgul: { rate: 1.2, pitch: 1.0, volume: 1.0 },
      detayci: { rate: 0.95, pitch: 1.0, volume: 1.0 }
    };

    const config = speechConfig[personality] || { rate: 1.0, pitch: 1.0, volume: 1.0 };
    
    // Return SSML for browser speech synthesis
    const ssml = `<speak version="1.0" xml:lang="tr-TR">
      <prosody rate="${config.rate}" pitch="${config.pitch > 1 ? '+' : ''}${(config.pitch - 1) * 100}%" volume="${config.volume}">
        ${text.replace(/[<>&"']/g, (match) => {
          const escape = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
          return escape[match];
        })}
      </prosody>
    </speak>`;

    return res.json({ ssml, config });
  } catch (err) {
    console.error('tts error', err);
    return res.status(500).json({ error: 'TTS hatası' });
  }
});

export default router;


