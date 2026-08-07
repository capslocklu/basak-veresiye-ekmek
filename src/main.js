// npm paketi olarak yüklenen Firebase — CDN script'e gerek yok.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

/* =========================================================================
   VERESİYE TAKİP — hangi müşterinin ne kadar veresiye ekmek aldığını takip
   eden basit, çok kullanıcılı (Firebase) uygulama.
   KURULUM: Aşağıdaki firebaseConfig'i kendi Firebase projenin bilgileriyle
   doldur. Doldurmazsan uygulama otomatik olarak "demo mod"da (localStorage)
   çalışır, böylece hemen test edebilirsin.
   ========================================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyCBOHjtLkvn0VCez5rY_hT_wCBV2SPWfm4",
  authDomain: "basak-veresiye-ekmek.firebaseapp.com",
  projectId: "basak-veresiye-ekmek",
  storageBucket: "basak-veresiye-ekmek.firebasestorage.app",
  messagingSenderId: "727312464606",
  appId: "1:727312464606:web:d1855db720d2636500204f"
};
const AUTH_DOMAIN_SUFFIX = '@veresiyetakip.local';
function toAuthEmail(kullaniciAdi){
  const v = (kullaniciAdi||'').trim();
  return v.includes('@') ? v : v + AUTH_DOMAIN_SUFFIX;
}
function kullaniciAdiCoz(authEmail){
  const v = (authEmail||'').trim();
  return v.endsWith(AUTH_DOMAIN_SUFFIX) ? v.slice(0,-AUTH_DOMAIN_SUFFIX.length) : v;
}

const DEMO_MODE = !firebaseConfig.apiKey;
let db, auth;
if(!DEMO_MODE){
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  db.settings({ experimentalForceLongPolling: true });
  db.enablePersistence({synchronizeTabs:true}).catch(err=>{
    console.warn('Offline destek bu tarayıcıda tam çalışmayabilir:', err.code);
  });
  document.getElementById('demoNote').style.display = 'none';
}

const LS_KEY = 'veresiyeTakip_demoData_v1';
function demoSeed(){
  return {
    users: [
      {id:'u1', email:'patron', ad:'Yönetici', role:'patron'}
    ],
    musteriler: [
      {id:'m1', ad:'Kum Ocağı', telefon:''},
      {id:'m2', ad:'Yaylalı Market', telefon:''},
      {id:'m3', ad:'Baraj', telefon:''},
      {id:'m4', ad:'Hastane', telefon:''},
      {id:'m5', ad:'6N Market', telefon:''},
      {id:'m6', ad:'Enerji Maden', telefon:''},
      {id:'m7', ad:'Aktif Tekstil', telefon:''},
      {id:'m8', ad:'Yeniçeri', telefon:''}
    ],
    ekmekTurleri: [
      {id:'e1', ad:'Baston Ekmek', fiyat:16},
      {id:'e2', ad:'Köy Ekmeği', fiyat:64},
      {id:'e3', ad:'Roll Ekmek', fiyat:4}
    ],
    kayitlar: [],
    odemeler: []
  };
}
function semaGuvenceyeAl(d){
  if(!Array.isArray(d.musteriler)) d.musteriler = [];
  if(!Array.isArray(d.ekmekTurleri)) d.ekmekTurleri = [];
  if(!Array.isArray(d.kayitlar)) d.kayitlar = [];
  if(!Array.isArray(d.odemeler)) d.odemeler = [];
  if(!Array.isArray(d.users)) d.users = [{id:'u1', email:'patron', ad:'Yönetici'}];
  if(!Array.isArray(d.sablon)) d.sablon = [];
  return d;
}
function demoLoad(){
  try{
    const d = JSON.parse(localStorage.getItem(LS_KEY)) || demoSeed();
    return semaGuvenceyeAl(d);
  } catch(e){ return demoSeed(); }
}
function demoSave(d){ localStorage.setItem(LS_KEY, JSON.stringify(d)); }

let DATA = DEMO_MODE ? demoLoad() : null;
function persist(){
  demoSave(DATA);
  if(!DEMO_MODE && db && !_uzaktanGuncelleniyor){
    db.collection('company').doc('data').set(DATA).catch(err=>{
      console.error('Firestore kayıt hatası', err);
      const oturumVar = auth && auth.currentUser ? ('VAR: '+auth.currentUser.email) : 'YOK (oturum düşmüş olabilir)';
      toast('⚠️ Bulut kaydı başarısız [' + (err.code||'?') + ']. Oturum: ' + oturumVar);
    });
  }
}
function firestoreVerisiniYukle(deneme){
  deneme = deneme || 1;
  return db.collection('company').doc('data').get().then(doc=>{
    if(doc.exists){
      DATA = semaGuvenceyeAl(doc.data());
    } else {
      DATA = demoSeed();
      return db.collection('company').doc('data').set(DATA);
    }
  }).catch(err=>{
    if(deneme < 3){
      return new Promise(resolve=>setTimeout(resolve, 1500)).then(()=>firestoreVerisiniYukle(deneme+1));
    }
    throw err;
  });
}
let _uzaktanGuncelleniyor = false;
let _dinleyiciKuruldu = false;
function canliSenkronuBaslat(){
  if(DEMO_MODE || !db || _dinleyiciKuruldu) return;
  _dinleyiciKuruldu = true;
  db.collection('company').doc('data').onSnapshot(doc=>{
    if(!doc.exists || !currentUser) return;
    _uzaktanGuncelleniyor = true;
    DATA = semaGuvenceyeAl(doc.data());
    demoSave(DATA);
    if(document.getElementById('app').style.display!=='none') renderTab(activeTab);
    _uzaktanGuncelleniyor = false;
  }, err=>console.error('Canlı senkron hatası', err));
}

/* ---------------- YARDIMCI FONKSİYONLAR ---------------- */
function fmt(n){ return Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>el.classList.remove('show'), 3200);
}
function showModal(html){
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalBg').classList.add('show');
}
function closeModal(){ document.getElementById('modalBg').classList.remove('show'); }
function musteriAdi(id){ const m = DATA.musteriler.find(x=>x.id===id); return m?m.ad:'—'; }
function turAdi(id){ const t = DATA.ekmekTurleri.find(x=>x.id===id); return t?t.ad:'—'; }
function musteriBakiye(musteriId){
  const m = DATA.musteriler.find(x=>x.id===musteriId);
  const acilis = (m && Number(m.acilisBakiyesi)) || 0;
  const borc = DATA.kayitlar.filter(k=>k.musteriId===musteriId && !k.odendi).reduce((s,k)=>s+k.adet*k.birimFiyat,0);
  const odeme = DATA.odemeler.filter(o=>o.musteriId===musteriId).reduce((s,o)=>s+o.tutar,0);
  return acilis + borc - odeme;
}
// Bir müşteri için bir ekmek türünün geçerli fiyatını döner — müşterinin o ürün için özel bir
// fiyatı varsa onu, yoksa ürünün standart (genel) fiyatını kullanır.
function birimFiyatHesapla(musteriId, turId){
  const m = DATA.musteriler.find(x=>x.id===musteriId);
  const t = DATA.ekmekTurleri.find(x=>x.id===turId);
  if(!t) return 0;
  if(m && m.ozelFiyatlar && m.ozelFiyatlar[turId]!=null && m.ozelFiyatlar[turId]!=='') return Number(m.ozelFiyatlar[turId]);
  return t.fiyat;
}
function musteriEtiketToId(){
  const map = {};
  const sayac = {};
  DATA.musteriler.forEach(m=>{
    let et = m.ad + (m.telefon?` (${m.telefon})`:'');
    if(sayac[et]){ sayac[et]++; et = `${et} #${sayac[et]}`; } else { sayac[et]=1; }
    map[et] = m.id;
  });
  return map;
}
// Kendi tasarımım müşteri arama/seç kutusu: boşken hiçbir şey göstermez, yazdıkça
// SADECE eşleşen müşterileri filtreleyip küçük bir liste olarak gösterir — tarayıcının
// yerleşik <datalist>'i (boşken tüm listeyi birden açan) yerine bunu kullanıyoruz.
function musteriAramaHtml(inputId, hiddenId, dropdownId, placeholder, callbackFn){
  return `
    <div style="position:relative">
      <input id="${inputId}" autocomplete="off" placeholder="${placeholder||'Müşteri adı yazmaya başla...'}"
        oninput="musteriAramaFiltrele('${inputId}','${dropdownId}','${hiddenId}','${callbackFn||''}')"
        onfocus="musteriAramaFiltrele('${inputId}','${dropdownId}','${hiddenId}','${callbackFn||''}')">
      <input type="hidden" id="${hiddenId}" value="">
      <div id="${dropdownId}" style="display:none;position:absolute;top:calc(100% - 10px);left:0;right:0;background:#fff;border:1.5px solid var(--card-border);border-radius:10px;max-height:220px;overflow-y:auto;z-index:20;box-shadow:0 6px 18px rgba(0,0,0,0.15);"></div>
    </div>`;
}
function musteriAramaFiltrele(inputId, dropdownId, hiddenId, callbackFn){
  const q = document.getElementById(inputId).value.trim().toLowerCase();
  const dropdown = document.getElementById(dropdownId);
  if(!q){ dropdown.style.display='none'; dropdown.innerHTML=''; return; }
  const eslesenler = DATA.musteriler.filter(m=>m.ad.toLowerCase().includes(q)).slice(0,8);
  if(!eslesenler.length){
    dropdown.innerHTML = `<div style="padding:10px 12px;font-size:13px;color:var(--muted)">Eşleşen müşteri yok.</div>`;
    dropdown.style.display='block';
    return;
  }
  dropdown.innerHTML = eslesenler.map(m=>`
    <div style="padding:10px 12px;font-size:14px;border-bottom:1px solid var(--card-border);cursor:pointer"
      onmousedown="musteriAramaSec('${inputId}','${dropdownId}','${hiddenId}','${m.id}','${callbackFn||''}')">${m.ad}</div>
  `).join('');
  dropdown.style.display='block';
}
function musteriAramaSec(inputId, dropdownId, hiddenId, musteriId, callbackFn){
  document.getElementById(inputId).value = musteriAdi(musteriId);
  document.getElementById(hiddenId).value = musteriId;
  document.getElementById(dropdownId).style.display = 'none';
  if(callbackFn && window[callbackFn]) window[callbackFn]();
}
function isPatron(){ return !currentUser || currentUser.role !== 'personel'; }
// personel için hangi müşterilerin bakiye/borç bilgisini görebileceğini döner; patron için null
// (null = kısıtlama yok, hepsini görür).
function gorunurBakiyeMusteriIdleri(){
  if(isPatron()) return null;
  return currentUser.gorebilecegiMusteriler || [];
}
function musteriBakiyeGorulebilir(musteriId){
  const izinliler = gorunurBakiyeMusteriIdleri();
  return izinliler===null || izinliler.includes(musteriId);
}

/* ---------------- GİRİŞ / OTURUM ---------------- */
let currentUser = null;
let _manuelGirisSurmekte = false;
function doLogin(){
  const kullaniciAdi = document.getElementById('loginKullanici').value.trim();
  const pass = document.getElementById('loginSifre').value;
  const remember = document.getElementById('rememberMe').checked;
  const errBox = document.getElementById('loginErr');
  errBox.style.display = 'none';
  if(!kullaniciAdi){ errBox.textContent='Kullanıcı adı gerekli'; errBox.style.display='block'; return; }

  if(DEMO_MODE){
    const u = DATA.users.find(x=>x.email.toLowerCase()===kullaniciAdi.toLowerCase());
    if(!u){
      errBox.textContent = 'Bu kullanıcı adı tanımlı değil. Patronun seni Personel sekmesinden eklemesi gerekiyor.';
      errBox.style.display = 'block';
      return;
    }
    currentUser = u;
    if(remember) localStorage.setItem('veresiyeTakip_rememberedUser', kullaniciAdi);
    enterApp();
    return;
  }

  _manuelGirisSurmekte = true;
  const persistence = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
  auth.setPersistence(persistence).then(()=>{
    return auth.signInWithEmailAndPassword(toAuthEmail(kullaniciAdi), pass);
  }).then(()=>{
    return firestoreVerisiniYukle();
  }).then(()=>{
    const u = DATA.users.find(x=>x.email.toLowerCase()===kullaniciAdi.toLowerCase());
    if(!u){
      errBox.textContent = 'Bu kullanıcı adı tanımlı değil. Patronun seni Personel sekmesinden eklemesi gerekiyor.';
      errBox.style.display = 'block';
      auth.signOut();
      return;
    }
    currentUser = u;
    canliSenkronuBaslat();
    enterApp();
  }).catch(err=>{
    console.error('Giriş hatası (tam detay):', err);
    errBox.textContent = 'Giriş başarısız [' + (err.code||'?') + ']: ' + err.message;
    errBox.style.display = 'block';
  }).finally(()=>{ _manuelGirisSurmekte = false; });
}
function doLogout(){
  if(!DEMO_MODE) auth.signOut();
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}
function enterApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('whoLabel').textContent = currentUser.ad + ' · ' + (isPatron() ? 'Patron (tam yetki)' : 'Personel (sınırlı yetki)');
  baglantiRozetiGuncelle();
  buildTabs();
  renderTab('ozet');
}
function baglantiRozetiGuncelle(){
  const rozet = document.getElementById('baglantiRozeti');
  if(!rozet) return;
  rozet.style.display = navigator.onLine ? 'none' : 'block';
}
window.addEventListener('online', ()=>{
  baglantiRozetiGuncelle();
  if(!DEMO_MODE) toast('🟢 İnternet geri geldi, bekleyen değişiklikler gönderiliyor...');
});
window.addEventListener('offline', ()=>{
  baglantiRozetiGuncelle();
  toast('🔴 İnternet bağlantın kesildi — girdiklerin kaybolmaz, bağlantı gelince otomatik gönderilir.');
});
window.addEventListener('load', ()=>{
  baglantiRozetiGuncelle();
  if(DEMO_MODE){
    const remembered = localStorage.getItem('veresiyeTakip_rememberedUser');
    if(remembered){
      const u = DATA.users.find(x=>x.email===remembered);
      if(u){ currentUser=u; enterApp(); }
    }
  } else {
    auth.onAuthStateChanged(user=>{
      if(user && !currentUser && !_manuelGirisSurmekte){
        firestoreVerisiniYukle().then(()=>{
          const kullaniciAdi = kullaniciAdiCoz(user.email);
          const u = DATA.users.find(x=>x.email.toLowerCase()===kullaniciAdi.toLowerCase());
          if(u){
            currentUser = u;
            canliSenkronuBaslat();
            enterApp();
          }
          // Kullanıcı DATA.users içinde yoksa sessizce giriş ekranında bırakıyoruz —
          // silinmiş/kaldırılmış bir personel bu şekilde otomatik oturum açamaz.
        });
      }
    });
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }
});

/* ---------------- SEKMELER ---------------- */
let activeTab = 'ozet';
const TABS = [
  {id:'ozet', label:'📊 Özet'},
  {id:'gunlukgiris', label:'📝 Günlük Giriş'},
  {id:'sablon', label:'🗂️ Giriş Şablonu'},
  {id:'kayitlar', label:'📒 Kayıtlar', patronOnly:true},
  {id:'borclar', label:'💳 Borçlar'},
  {id:'musteriler', label:'👥 Müşteriler'},
  {id:'turler', label:'🍞 Ekmek Türleri'},
  {id:'raporlar', label:'📈 Raporlar'},
  {id:'personel', label:'🔑 Personel', patronOnly:true},
];
function buildTabs(){
  const nav = document.getElementById('tabsNav');
  const gorunecekler = TABS.filter(t => !t.patronOnly || isPatron());
  nav.innerHTML = gorunecekler.map(t=>`<button data-tab="${t.id}" onclick="renderTab('${t.id}')">${t.label}</button>`).join('');
}
function renderTab(id){
  if((id==='personel' || id==='kayitlar') && !isPatron()) id = 'ozet'; // güvenlik: personel bu sekmelere giremesin
  activeTab = id;
  document.querySelectorAll('#tabsNav button').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  const main = document.getElementById('mainContent');
  const renderers = {
    ozet: renderOzetTab,
    gunlukgiris: renderGunlukGirisTab,
    sablon: renderSablonTab,
    kayitlar: renderKayitlarTab,
    borclar: renderBorclarTab,
    musteriler: renderMusterilerTab,
    turler: renderTurlerTab,
    raporlar: renderRaporlarTab,
    personel: renderPersonelTab,
  };
  (renderers[id]||renderOzetTab)(main);
}
function fabAction(){ acYeniKayitModal(); }

/* ---------------- ÖZET ---------------- */
function renderOzetTab(main){
  const gorunurMusteriler = DATA.musteriler.filter(m=>musteriBakiyeGorulebilir(m.id));
  const borcluMusteriler = gorunurMusteriler.filter(m=>musteriBakiye(m.id)>0);
  const toplamBorc = borcluMusteriler.reduce((s,m)=>s+musteriBakiye(m.id),0);
  const bugunKayitlar = DATA.kayitlar.filter(k=>k.tarih===todayISO());
  const bugunAdet = bugunKayitlar.reduce((s,k)=>s+k.adet,0);
  main.innerHTML = `
    <div class="statRow">
      <div class="stat"><div class="n">₺${fmt(toplamBorc)}</div><div class="l">${isPatron()?'Toplam Açık Veresiye':'Görebildiklerinin Toplam Borcu'}</div></div>
      <div class="stat"><div class="n">${borcluMusteriler.length}</div><div class="l">Borçlu Müşteri</div></div>
      <div class="stat"><div class="n">${bugunAdet}</div><div class="l">Bugün Verilen Ekmek</div></div>
    </div>
    <div class="card">
      <h2>Hızlı İşlem</h2>
      <button class="btn btn-primary btn-block" onclick="acYeniKayitModal()">➕ Yeni Veresiye Kaydı</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="acGenelOdemeModal()">💳 Ödeme Al</button>
    </div>
    <div class="card">
      <h2>En Çok Borçlu 10 Müşteri ${isPatron()?'<span style="font-size:11px;color:var(--muted);font-weight:400">(detay için dokun)</span>':''}</h2>
      ${renderMusteriMiniListe([...borcluMusteriler].sort((a,b)=>musteriBakiye(b.id)-musteriBakiye(a.id)).slice(0,10))}
    </div>
  `;
}
function renderMusteriMiniListe(musteriler){
  if(!musteriler.length) return `<div class="empty">Şu an borçlu müşteri yok 🎉</div>`;
  const tiklanabilir = isPatron();
  const rows = musteriler.map(m=>`
    <tr ${tiklanabilir?`style="cursor:pointer" onclick="editMusteriModal('${m.id}')"`:''}>
      <td>${m.ad}</td>
      <td style="text-align:right"><span class="pill pill-debt">₺${fmt(musteriBakiye(m.id))}</span></td>
    </tr>`).join('');
  return `<table><tbody>${rows}</tbody></table>`;
}

/* ---------------- YENİ KAYIT (veresiye ekmek verildi) ---------------- */
function acYeniKayitModal(){
  if(!DATA.musteriler.length){ toast('Önce bir müşteri ekle'); return; }
  if(!DATA.ekmekTurleri.length){ toast('Önce bir ekmek türü ekle'); return; }
  const turOpts = DATA.ekmekTurleri.map(t=>`<option value="${t.id}" data-fiyat="${t.fiyat}">${t.ad} (₺${fmt(t.fiyat)})</option>`).join('');
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>Yeni Veresiye Kaydı</h3>
    <label>Müşteri</label>
    ${musteriAramaHtml('kMusteriArama','kMusteriId','kMusteriDropdown', null, 'kayitFiyatGuncelle')}
    <div style="height:12px"></div>
    <label>Ekmek Türü</label>
    <select id="kTur" onchange="kayitFiyatGuncelle()">${turOpts}</select>
    <label>Adet</label>
    <input id="kAdet" type="number" min="1" inputmode="numeric" placeholder="adet">
    <label>Birim Fiyat (₺)</label>
    <input id="kFiyat" type="number" step="0.01">
    <label>Tarih</label>
    <input id="kTarih" type="date" value="${todayISO()}" max="${todayISO()}">
    <label style="display:flex;align-items:center;gap:6px;">
      <input type="checkbox" id="kOdendi" style="width:auto;margin:0">
      <span style="font-weight:500;color:var(--text)">Peşin ödendi (veresiyeye yazma)</span>
    </label>
    <button class="btn btn-primary btn-block" onclick="kaydetYeniKayit()">Kaydet</button>
  `);
  kayitFiyatGuncelle();
  setTimeout(()=>document.getElementById('kMusteriArama').focus(), 50);
}
function kayitFiyatGuncelle(){
  const turId = document.getElementById('kTur').value;
  const musteriId = document.getElementById('kMusteriId').value;
  document.getElementById('kFiyat').value = musteriId ? birimFiyatHesapla(musteriId, turId) : (DATA.ekmekTurleri.find(t=>t.id===turId)||{}).fiyat || '';
}
function kaydetYeniKayit(){
  const musteriId = document.getElementById('kMusteriId').value;
  const turId = document.getElementById('kTur').value;
  const adet = Number(document.getElementById('kAdet').value);
  const fiyat = Number(document.getElementById('kFiyat').value);
  const tarih = document.getElementById('kTarih').value || todayISO();
  const odendi = document.getElementById('kOdendi').checked;
  if(!musteriId){ toast('Listeden bir müşteri seç'); return; }
  if(!adet || adet<=0){ toast('Geçerli bir adet gir'); return; }
  DATA.kayitlar.push({
    id:'k_'+Date.now(), musteriId, turId, adet, birimFiyat:fiyat, tarih, odendi
  });
  persist(); musteriPortalSenkronEt(musteriId); closeModal(); toast('Kaydedildi ✓'); renderTab(activeTab);
}

/* ---------------- KAYITLAR (geçmiş liste) ---------------- */
function renderKayitlarTab(main){
  const kayitlar = [...DATA.kayitlar].sort((a,b)=>a.tarih<b.tarih?1:-1);
  main.innerHTML = `
    <div class="card">
      <h2>Kayıtlar</h2>
      <button class="btn btn-primary" style="margin-bottom:14px" onclick="acYeniKayitModal()">➕ Yeni Kayıt</button>
      ${renderKayitTablosu(kayitlar)}
    </div>
  `;
}
function renderKayitTablosu(list){
  if(!list.length) return `<div class="empty">Henüz kayıt yok.</div>`;
  const rows = list.map(k=>{
    const tutar = k.adet*k.birimFiyat;
    return `<tr>
      <td>${k.tarih}</td>
      <td>${musteriAdi(k.musteriId)}</td>
      <td>${turAdi(k.turId)}</td>
      <td>${k.adet}</td>
      <td>₺${fmt(tutar)}</td>
      <td>${k.odendi ? '<span class="pill pill-paid">Peşin</span>' : '<span class="pill pill-debt">Veresiye</span>'}</td>
      <td style="white-space:nowrap">
        <button class="iconbtn" onclick="editKayitModal('${k.id}')" title="Düzenle">✏️</button>
        <button class="rowDel" onclick="silKayit('${k.id}')" title="Sil">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  return `<table><thead><tr><th>Tarih</th><th>Müşteri</th><th>Tür</th><th>Adet</th><th>Tutar</th><th>Durum</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function editKayitModal(kayitId){
  const k = DATA.kayitlar.find(x=>x.id===kayitId);
  if(!k) return;
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>${musteriAdi(k.musteriId)} — ${turAdi(k.turId)}</h3>
    <label>Adet</label>
    <input id="ekAdet" type="number" min="1" value="${k.adet}">
    <label>Birim Fiyat (₺)</label>
    <input id="ekFiyat" type="number" step="0.01" value="${k.birimFiyat}">
    <label>Tarih</label>
    <input id="ekTarih" type="date" value="${k.tarih}" max="${todayISO()}">
    <label style="display:flex;align-items:center;gap:6px;">
      <input type="checkbox" id="ekOdendi" style="width:auto;margin:0" ${k.odendi?'checked':''}>
      <span style="font-weight:500;color:var(--text)">Peşin ödendi</span>
    </label>
    <button class="btn btn-primary btn-block" onclick="saveEditKayit('${kayitId}')">Kaydet</button>
  `);
}
function saveEditKayit(kayitId){
  const k = DATA.kayitlar.find(x=>x.id===kayitId);
  if(!k) return;
  const adet = Number(document.getElementById('ekAdet').value);
  if(!adet || adet<=0){ toast('Geçerli bir adet gir'); return; }
  k.adet = adet;
  k.birimFiyat = Number(document.getElementById('ekFiyat').value);
  k.tarih = document.getElementById('ekTarih').value;
  k.odendi = document.getElementById('ekOdendi').checked;
  persist(); musteriPortalSenkronEt(k.musteriId); closeModal(); toast('Güncellendi ✓'); renderTab(activeTab);
}
function silKayit(kayitId){
  if(!confirm('Bu kayıt silinsin mi?')) return;
  const k = DATA.kayitlar.find(x=>x.id===kayitId);
  const musteriId = k ? k.musteriId : null;
  DATA.kayitlar = DATA.kayitlar.filter(k=>k.id!==kayitId);
  persist(); if(musteriId) musteriPortalSenkronEt(musteriId); toast('Silindi ✓'); renderTab(activeTab);
}

/* ---------------- BORÇLAR / VERESİYE ---------------- */
function musteriToplamBorc(musteriId){
  const m = DATA.musteriler.find(x=>x.id===musteriId);
  const acilis = (m && Number(m.acilisBakiyesi)) || 0;
  return acilis + DATA.kayitlar.filter(k=>k.musteriId===musteriId && !k.odendi).reduce((s,k)=>s+k.adet*k.birimFiyat,0);
}
function musteriToplamOdenen(musteriId){
  return DATA.odemeler.filter(o=>o.musteriId===musteriId).reduce((s,o)=>s+o.tutar,0);
}
function renderBorclarTab(main){
  const musteriler = DATA.musteriler.filter(m=>musteriBakiye(m.id)!==0 && musteriBakiyeGorulebilir(m.id))
    .sort((a,b)=>musteriBakiye(b.id)-musteriBakiye(a.id));
  const rows = musteriler.map(m=>{
    const bakiye = musteriBakiye(m.id);
    const toplamBorc = musteriToplamBorc(m.id);
    const toplamOdenen = musteriToplamOdenen(m.id);
    return `<tr>
      <td>${m.ad}${m.telefon?`<br><a href="tel:${m.telefon.replace(/\s+/g,'')}" style="font-size:11px;color:var(--crust);text-decoration:none">📞 ${m.telefon}</a>`:''}</td>
      <td style="font-size:12px;color:var(--muted)">
        Borç: ₺${fmt(toplamBorc)}<br>Ödenen: ₺${fmt(toplamOdenen)}
      </td>
      <td>${bakiye>0 ? `<span class="pill pill-debt">₺${fmt(bakiye)} borçlu</span>` : `<span class="pill pill-paid">₺${fmt(-bakiye)} alacaklı</span>`}</td>
      <td class="rowActions" style="white-space:nowrap">
        <button class="btn btn-ghost" onclick="odemeAlModal('${m.id}')">Tahsilat</button>
        <button class="iconbtn" onclick="odemeGecmisiModal('${m.id}')" title="Ödeme geçmişi">🧾</button>
      </td>
    </tr>`;
  }).join('');
  main.innerHTML = `
    <div class="card">
      <h2>Borçlar</h2>
      <p style="font-size:12px;color:var(--muted);margin:-4px 0 10px">
        "Borç" = veresiye yazılan tüm teslimatların toplamı, "Ödenen" = bugüne kadar aldığın tüm
        tahsilatların toplamı. "Bakiye" ikisi arasındaki farktır — tahsilat aldıkça otomatik düşer.
      </p>
      <table><thead><tr><th>Müşteri</th><th>Döküm</th><th>Bakiye</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4"><div class="empty">Açık veresiye yok 🎉</div></td></tr>`}</tbody></table>
    </div>
  `;
}
function odemeGecmisiModal(musteriId){
  if(!musteriBakiyeGorulebilir(musteriId)){ toast('Bu müşteri için yetkin yok'); return; }
  const odemeler = DATA.odemeler.filter(o=>o.musteriId===musteriId).sort((a,b)=>a.tarih<b.tarih?1:-1);
  const rows = odemeler.map(o=>`
    <tr><td>${o.tarih}</td><td>₺${fmt(o.tutar)}</td><td>${o.not||'—'}</td></tr>
  `).join('');
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>${musteriAdi(musteriId)} — Ödeme Geçmişi</h3>
    <p style="font-size:12.5px;color:var(--muted);margin:0 0 10px">
      Toplam Borç: ₺${fmt(musteriToplamBorc(musteriId))} · Toplam Ödenen: ₺${fmt(musteriToplamOdenen(musteriId))} ·
      Güncel Bakiye: ₺${fmt(musteriBakiye(musteriId))}
    </p>
    <table><thead><tr><th>Tarih</th><th>Tutar</th><th>Not</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="3"><div class="empty">Henüz ödeme kaydı yok.</div></td></tr>`}</tbody></table>
  `);
}
// Belirli bir müşteri için değil, herhangi bir müşteriyi ARAYIP SEÇEREK tahsilat girebileceğin
// genel amaçlı ödeme penceresi — Özet'teki "Ödeme Al" hızlı işleminden açılır. Müşteri Borçlar
// listesinde görünmüyorsa (örn. bakiyesi zaten kapalıysa) bile buradan ödeme girilebilir.
function acGenelOdemeModal(){
  if(!DATA.musteriler.length){ toast('Önce bir müşteri ekle'); return; }
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>Ödeme Al</h3>
    <label>Müşteri</label>
    ${musteriAramaHtml('goMusteriArama','goMusteriId','goMusteriDropdown')}
    <div style="height:12px"></div>
    <label>Tutar (₺)</label>
    <input id="goTutar" type="number" step="0.01">
    <label>Not (opsiyonel)</label>
    <input id="goNot" placeholder="örn: elden nakit">
    <button class="btn btn-primary btn-block" onclick="kaydetGenelOdeme()">Kaydet</button>
  `);
  setTimeout(()=>document.getElementById('goMusteriArama').focus(), 50);
}
function kaydetGenelOdeme(){
  const musteriId = document.getElementById('goMusteriId').value;
  const tutar = Number(document.getElementById('goTutar').value);
  const not = document.getElementById('goNot').value.trim();
  if(!musteriId){ toast('Listeden bir müşteri seç'); return; }
  if(!musteriBakiyeGorulebilir(musteriId)){ toast('Bu müşteri için yetkin yok'); return; }
  if(!tutar || tutar<=0){ toast('Geçerli bir tutar gir'); return; }
  DATA.odemeler.push({id:'o_'+Date.now(), musteriId, tutar, tarih:todayISO(), not});
  persist(); musteriPortalSenkronEt(musteriId); closeModal(); toast('Tahsilat kaydedildi ✓'); renderTab(activeTab);
}
function odemeAlModal(musteriId){
  if(!musteriBakiyeGorulebilir(musteriId)){ toast('Bu müşteri için yetkin yok'); return; }
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>${musteriAdi(musteriId)} — Tahsilat</h3>
    <p style="font-size:12.5px;color:var(--muted);margin:0 0 10px">Güncel bakiye: ₺${fmt(musteriBakiye(musteriId))}</p>
    <label>Tutar (₺)</label>
    <input id="oTutar" type="number" step="0.01">
    <label>Not (opsiyonel)</label>
    <input id="oNot" placeholder="örn: elden nakit">
    <button class="btn btn-primary btn-block" onclick="kaydetOdeme('${musteriId}')">Kaydet</button>
  `);
  setTimeout(()=>document.getElementById('oTutar').focus(), 50);
}
function kaydetOdeme(musteriId){
  const tutar = Number(document.getElementById('oTutar').value);
  const not = document.getElementById('oNot').value.trim();
  if(!tutar || tutar<=0){ toast('Geçerli bir tutar gir'); return; }
  DATA.odemeler.push({id:'o_'+Date.now(), musteriId, tutar, tarih:todayISO(), not});
  persist(); musteriPortalSenkronEt(musteriId); closeModal(); toast('Tahsilat kaydedildi ✓'); renderTab('borclar');
}

/* ---------------- MÜŞTERİLER ---------------- */
function musteriSatirlariniOlustur(){
  let musteriler = DATA.musteriler;
  const arama = (window._musteriArama||'').toLowerCase().trim();
  if(arama) musteriler = musteriler.filter(m=>m.ad.toLowerCase().includes(arama) || (m.telefon||'').includes(arama));
  const rows = musteriler.map(m=>{
    const gorebilir = musteriBakiyeGorulebilir(m.id);
    return `
    <tr>
      <td>${m.ad}${m.telefon?`<br><a href="tel:${m.telefon.replace(/\s+/g,'')}" style="font-size:11px;color:var(--crust);text-decoration:none">📞 ${m.telefon}</a>`:''}</td>
      <td>${gorebilir ? '₺'+fmt(musteriBakiye(m.id)) : '<span style="color:var(--muted)">🔒 Gizli</span>'}</td>
      <td class="rowActions">
        ${isPatron() ? `<button class="iconbtn" onclick="editMusteriModal('${m.id}')">✏️</button>
        <button class="iconbtn" onclick="silMusteri('${m.id}')">🗑️</button>` : ''}
      </td>
    </tr>`;
  }).join('');
  return rows || `<tr><td colspan="3"><div class="empty">${arama?'Aramayla eşleşen müşteri yok.':'Henüz müşteri yok.'}</div></td></tr>`;
}
function musteriAramaGuncelle(deger){
  window._musteriArama = deger;
  const tbody = document.getElementById('musteriSonucTbody');
  if(tbody) tbody.innerHTML = musteriSatirlariniOlustur();
}
function renderMusterilerTab(main){
  main.innerHTML = `
    <div class="card">
      <h2>Müşteriler</h2>
      <input type="text" placeholder="🔍 Müşteri ara..." value="${window._musteriArama||''}" oninput="musteriAramaGuncelle(this.value)">
      <table><thead><tr><th>Ad</th><th>Bakiye</th><th></th></tr></thead>
      <tbody id="musteriSonucTbody">${musteriSatirlariniOlustur()}</tbody></table>
      ${isPatron() ? `
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="editMusteriModal(null)">+ Yeni Müşteri</button>
        <button class="btn btn-ghost" onclick="topluMusteriEkleModal()">📋 Toplu Ekle</button>
      </div>` : ''}
    </div>
  `;
}
function topluMusteriEkleModal(){
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>Toplu Müşteri Ekle</h3>
    <p style="font-size:12px;color:var(--muted);margin:0 0 10px">
      Her satıra bir müşteri adı yaz, hepsi tek seferde eklenir. Telefon/bakiye gibi detayları
      sonradan tek tek düzenleyebilirsin.
    </p>
    <textarea id="topluMusteriAlan" rows="8" style="width:100%;padding:11px 12px;border:1.5px solid var(--card-border);border-radius:10px;font-size:14px;font-family:inherit;" placeholder="Kum Ocağı&#10;Yaylalı Market&#10;Baraj&#10;Hastane&#10;6N Market&#10;Enerji Maden&#10;Aktif Tekstil&#10;Yeniçeri"></textarea>
    <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="kaydetTopluMusteri()">Hepsini Ekle</button>
  `);
}
function kaydetTopluMusteri(){
  const alan = document.getElementById('topluMusteriAlan').value;
  const isimler = alan.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!isimler.length){ toast('En az bir isim yaz'); return; }
  let eklenen = 0;
  isimler.forEach(ad=>{
    const zatenVar = DATA.musteriler.some(m=>m.ad.toLowerCase()===ad.toLowerCase());
    if(!zatenVar){
      DATA.musteriler.push({id:'m_'+Date.now()+'_'+Math.random().toString(36).slice(2,7), ad, telefon:''});
      eklenen++;
    }
  });
  persist(); closeModal(); toast(`${eklenen} müşteri eklendi ✓`); renderTab('musteriler');
}
function editMusteriModal(id){
  const m = id ? DATA.musteriler.find(x=>x.id===id) : {ad:'', telefon:'', adSoyad:''};
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>${id?'Müşteriyi Düzenle':'Yeni Müşteri'}</h3>
    <label>İşletme Adı</label>
    <input id="mAd" value="${m.ad||''}" placeholder="örn: 6N Market">
    <label>Ad Soyad (opsiyonel — WhatsApp mesajında hitap için kullanılır)</label>
    <input id="mAdSoyad" value="${m.adSoyad||''}" placeholder="örn: Ahmet Yılmaz — boş bırakırsan işletme adı kullanılır">
    <label>Telefon (opsiyonel)</label>
    <input id="mTel" value="${m.telefon||''}" placeholder="0532 123 45 67">
    <label>Geçmiş Bakiye (Bu Sisteme Geçmeden Önceki Devreden Borç, opsiyonel)</label>
    <input id="mAcilis" type="number" step="0.01" value="${m.acilisBakiyesi||''}" placeholder="0 — eski defterden aktarılan borç varsa buraya gir">
    ${DATA.ekmekTurleri.length ? `
    <h3 style="margin-top:16px">Özel Fiyatlar (opsiyonel)</h3>
    <p style="font-size:11.5px;color:var(--muted);margin:0 0 10px">
      Bu müşteriye bazı ürünlerde farklı (özel/indirimli) fiyat çekiyorsan buradan belirle — boş
      bıraktığın ürünler standart fiyattan devam eder. Günlük Giriş'te ve Yeni Kayıt'ta bu müşteri
      için otomatik uygulanır.
    </p>
    ${DATA.ekmekTurleri.map(t=>`
      <label style="font-weight:400;color:var(--text)">${t.ad} <span style="color:var(--muted);font-size:11px">(standart ₺${fmt(t.fiyat)})</span></label>
      <div style="display:flex;gap:8px;align-items:flex-start">
        <input class="ozelFiyatInput" data-tur="${t.id}" type="number" step="0.01" value="${(m.ozelFiyatlar&&m.ozelFiyatlar[t.id]!=null)?m.ozelFiyatlar[t.id]:''}" placeholder="boş = standart fiyat" style="flex:1">
        ${id ? `<button type="button" class="btn btn-ghost" style="white-space:nowrap;padding:11px 12px;font-size:12px" onclick="gecmisFiyatDuzelt('${id}','${t.id}')" title="Bu fiyatı bu müşterinin bu üründeki TÜM geçmiş kayıtlarına da uygula">🔧 Geçmişe Uygula</button>` : ''}
      </div>
    `).join('')}
    ` : ''}
    ${id ? `
    <h3 style="margin-top:16px">Müşteri Portalı</h3>
    <p style="font-size:11.5px;color:var(--muted);margin:0 0 10px">
      Müşteri, kendisine özel linke girip aşağıda belirleyeceğin şifreyi yazarak sadece kendi
      bakiyesini ve aldığı ekmek adetlerini görebilir. Şirketinin diğer verilerine asla erişemez.
    </p>
    <label>Portal Şifresi</label>
    <input id="mPortalSifre" value="${m.portalSifre||''}" placeholder="örn: 1234 (müşteriye söyleyeceğin şifre)">
    ${m.erisimKodu ? `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:rgba(0,0,0,0.03);padding:10px;border-radius:8px;margin-top:8px">
        <input id="portalLinkGoster" readonly value="${window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')+1)}portal.html?kod=${m.erisimKodu}" style="flex:1;min-width:180px;font-size:11.5px;margin-bottom:0">
        <button class="btn btn-ghost" onclick="portalLinkKopyala()">📋 Kopyala</button>
      </div>
      <button class="btn btn-block" style="margin-top:8px;background:#25D366;color:#fff" onclick="portalWhatsappGonder('${id}')">📱 WhatsApp'tan Gönder</button>
    ` : `<p style="font-size:11.5px;color:var(--crust);margin-top:8px">Kaydet'e bastığında link otomatik oluşacak.</p>`}
    ` : `<p style="font-size:11.5px;color:var(--muted);margin-top:12px">Portal linki, müşteriyi kaydettikten sonra oluşturulabilir.</p>`}
    <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="saveMusteri('${id||''}')">Kaydet</button>
  `);
  setTimeout(()=>document.getElementById('mAd').focus(), 50);
}
function portalLinkKopyala(){
  const el = document.getElementById('portalLinkGoster');
  el.select();
  navigator.clipboard ? navigator.clipboard.writeText(el.value).then(()=>toast('Kopyalandı ✓')) : document.execCommand('copy');
}
// Portal linkini VE şifresini hazır bir mesaj olarak WhatsApp'a gönderir. Müşterinin telefonu
// kayıtlıysa direkt onun sohbetini açar; yoksa WhatsApp'ın kendi kişi seçme ekranını açar.
function portalWhatsappGonder(musteriId){
  const m = DATA.musteriler.find(x=>x.id===musteriId);
  if(!m || !m.erisimKodu){ toast('Önce portal linkini oluştur'); return; }
  const sifreEl = document.getElementById('mPortalSifre');
  const sifre = sifreEl ? sifreEl.value.trim() : (m.portalSifre||'');
  if(!sifre){ toast("Önce bir portal şifresi belirle ve Kaydet'e bas"); return; }
  const link = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')+1) + 'portal.html?kod=' + m.erisimKodu;
  const hitapAdi = m.adSoyad || m.ad;
  const mesaj = `Merhaba ${hitapAdi}, ekmek hesabınızı görebileceğiniz link:\n${link}\n\nŞifreniz: ${sifre}`;
  const telefonTemiz = (m.telefon||'').replace(/[^0-9]/g,'');
  const numaraliLink = telefonTemiz ? `https://wa.me/${telefonTemiz.startsWith('90')?telefonTemiz:'90'+telefonTemiz.replace(/^0/,'')}` : 'https://wa.me/';
  window.open(`${numaraliLink}?text=${encodeURIComponent(mesaj)}`, '_blank');
}
function rastgeleErisimKodu(){
  const alfabe = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let kod = '';
  for(let i=0;i<20;i++) kod += alfabe[Math.floor(Math.random()*alfabe.length)];
  return kod;
}
function musteriPortalSenkronEt(musteriId){
  if(DEMO_MODE || !db) return;
  const m = DATA.musteriler.find(x=>x.id===musteriId);
  if(!m || !m.erisimKodu) return;
  // Aylık raporlama görebilmesi için son 25 değil, son 300 kaydı gönderiyoruz (küçük bir işletme
  // için birkaç yıllık geçmişi kolayca kapsar).
  // 300 kayıt sınırı bazı müşterilerde ayın başını kesiyordu (yoğun müşterilerde birkaç ayda
  // 300'ü geçebiliyor). 3000'e çıkardık — bu, Firestore'un tek belge için izin verdiği 1MB
  // sınırının çok altında kalıyor (her kayıt yaklaşık 100 bayt, 3000 kayıt ~300KB eder).
  const sonKayitlar = DATA.kayitlar.filter(k=>k.musteriId===musteriId).sort((a,b)=>a.tarih<b.tarih?1:-1).slice(0,3000)
    .map(k=>({tarih:k.tarih, urun:turAdi(k.turId), adet:k.adet, tutar:k.adet*k.birimFiyat, odendi:k.odendi}));
  db.collection('musteriPortal').doc(m.erisimKodu).set({
    ad: m.ad, bakiye: musteriBakiye(musteriId), acilisBakiyesi: Number(m.acilisBakiyesi)||0,
    sifre: m.portalSifre || '', sonKayitlar, guncellenme: new Date().toISOString()
  }).catch(err=>console.error('Portal senkron hatası', err));
}
// Bir müşterinin bir üründeki TÜM geçmiş kayıtlarının fiyatını, o an kutuda yazan (ya da boşsa
// standart) fiyata göre toplu olarak günceller. Özel fiyatı da aynı anda kaydeder ki modal
// kapandığında kaybolmasın.
function gecmisFiyatDuzelt(musteriId, turId){
  const input = document.querySelector(`.ozelFiyatInput[data-tur="${turId}"]`);
  const deger = input.value.trim();
  const t = DATA.ekmekTurleri.find(x=>x.id===turId);
  const yeniFiyat = deger !== '' ? Number(deger) : t.fiyat;
  const etkilenen = DATA.kayitlar.filter(k=>k.musteriId===musteriId && k.turId===turId);
  if(!etkilenen.length){ toast('Bu üründe geçmiş kaydı yok'); return; }
  if(!confirm(`${musteriAdi(musteriId)} — ${t.ad}: geçmişteki ${etkilenen.length} kayıt ₺${fmt(yeniFiyat)} olarak güncellensin mi? Bu işlem geri alınamaz.`)) return;
  etkilenen.forEach(k=>{ k.birimFiyat = yeniFiyat; });
  // Özel fiyatı da bu arada kaydedelim ki kutuyu boş bırakmadıysa modal kapanınca kaybolmasın.
  const m = DATA.musteriler.find(x=>x.id===musteriId);
  if(!m.ozelFiyatlar) m.ozelFiyatlar = {};
  if(deger !== '') m.ozelFiyatlar[turId] = yeniFiyat; else delete m.ozelFiyatlar[turId];
  persist(); musteriPortalSenkronEt(musteriId);
  toast(`${etkilenen.length} kayıt güncellendi ✓`);
}
function saveMusteri(id){
  const ad = document.getElementById('mAd').value.trim();
  const adSoyad = document.getElementById('mAdSoyad').value.trim();
  const telefon = document.getElementById('mTel').value.trim();
  const acilisBakiyesi = Number(document.getElementById('mAcilis').value) || 0;
  const portalSifre = id ? document.getElementById('mPortalSifre').value.trim() : '';
  const ozelFiyatlar = {};
  document.querySelectorAll('.ozelFiyatInput').forEach(el=>{
    const deger = el.value.trim();
    if(deger !== '') ozelFiyatlar[el.dataset.tur] = Number(deger);
  });
  if(!ad){ toast('Müşteri adı gerekli'); return; }
  let musteriId = id;
  if(id){
    const m = DATA.musteriler.find(x=>x.id===id);
    if(!m.erisimKodu) m.erisimKodu = rastgeleErisimKodu();
    Object.assign(m, {ad, adSoyad, telefon, acilisBakiyesi, portalSifre, ozelFiyatlar});
  } else {
    musteriId = 'm_'+Date.now();
    DATA.musteriler.push({id:musteriId, ad, adSoyad, telefon, acilisBakiyesi, portalSifre:'', erisimKodu:rastgeleErisimKodu(), ozelFiyatlar});
  }
  persist(); musteriPortalSenkronEt(musteriId); closeModal(); toast('Kaydedildi ✓'); renderTab(activeTab);
}
function silMusteri(id){
  if(!confirm('Bu müşteriyi silmek istediğine emin misin? Geçmiş kayıtları da silinir.')) return;
  DATA.musteriler = DATA.musteriler.filter(m=>m.id!==id);
  DATA.kayitlar = DATA.kayitlar.filter(k=>k.musteriId!==id);
  DATA.odemeler = DATA.odemeler.filter(o=>o.musteriId!==id);
  persist(); toast('Silindi ✓'); renderTab(activeTab);
}

/* ---------------- EKMEK TÜRLERİ ---------------- */
function renderTurlerTab(main){
  const rows = DATA.ekmekTurleri.map(t=>`
    <tr>
      <td>${t.ad}</td>
      <td>₺${fmt(t.fiyat)}</td>
      <td class="rowActions">
        <button class="iconbtn" onclick="editTurModal('${t.id}')">✏️</button>
        <button class="iconbtn" onclick="silTur('${t.id}')">🗑️</button>
      </td>
    </tr>`).join('');
  main.innerHTML = `
    <div class="card">
      <h2>Ekmek Türleri</h2>
      <table><thead><tr><th>Ad</th><th>Fiyat</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="3"><div class="empty">Henüz tür yok.</div></td></tr>`}</tbody></table>
      <button class="btn btn-primary" style="margin-top:14px" onclick="editTurModal(null)">+ Yeni Tür</button>
    </div>
  `;
}
function editTurModal(id){
  const t = id ? DATA.ekmekTurleri.find(x=>x.id===id) : {ad:'', fiyat:''};
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>${id?'Türü Düzenle':'Yeni Ekmek Türü'}</h3>
    <label>Ad</label>
    <input id="tAd" value="${t.ad||''}" placeholder="örn: Somun, Baston...">
    <label>Fiyat (₺)</label>
    <input id="tFiyat" type="number" step="0.01" value="${t.fiyat||''}">
    <button class="btn btn-primary btn-block" onclick="saveTur('${id||''}')">Kaydet</button>
  `);
  setTimeout(()=>document.getElementById('tAd').focus(), 50);
}
function saveTur(id){
  const ad = document.getElementById('tAd').value.trim();
  const fiyat = Number(document.getElementById('tFiyat').value);
  if(!ad){ toast('Ad gerekli'); return; }
  if(!fiyat || fiyat<=0){ toast('Geçerli bir fiyat gir'); return; }
  if(id){
    Object.assign(DATA.ekmekTurleri.find(x=>x.id===id), {ad, fiyat});
  } else {
    DATA.ekmekTurleri.push({id:'e_'+Date.now(), ad, fiyat});
  }
  persist(); closeModal(); toast('Kaydedildi ✓'); renderTab('turler');
}
function silTur(id){
  if(!confirm('Bu ekmek türünü silmek istediğine emin misin?')) return;
  DATA.ekmekTurleri = DATA.ekmekTurleri.filter(t=>t.id!==id);
  persist(); toast('Silindi ✓'); renderTab('turler');
}

/* ---------------- RAPORLAR ---------------- */
let raporDonemTipi = 'bu_ay';
let raporBaslangic = null;
let raporBitis = null;
function raporTarihAraligiHesapla(){
  const bugun = new Date(todayISO()+'T00:00:00');
  let bas, bit;
  if(raporDonemTipi==='bugun'){
    bas = bit = todayISO();
  } else if(raporDonemTipi==='bu_hafta'){
    const gun = bugun.getDay(); // 0=Pazar
    const pazartesi = new Date(bugun); pazartesi.setDate(bugun.getDate() - ((gun+6)%7));
    bas = pazartesi.toISOString().slice(0,10);
    bit = todayISO();
  } else if(raporDonemTipi==='bu_ay'){
    bas = todayISO().slice(0,8)+'01';
    bit = todayISO();
  } else if(raporDonemTipi==='ozel'){
    bas = raporBaslangic || todayISO();
    bit = raporBitis || todayISO();
  }
  return {bas, bit};
}
function raporDonemDegisti(tip){
  raporDonemTipi = tip;
  renderTab('raporlar');
}
function raporOzelTarihGuncelle(){
  raporBaslangic = document.getElementById('raporBas').value;
  raporBitis = document.getElementById('raporBit').value;
  renderRaporSonuclari();
}
let raporSeciliMusteri = null;
let raporSeciliUrun = null;
function renderRaporlarTab(main){
  main.innerHTML = `
    <div class="card">
      <h2>Raporlar</h2>
      <label>Dönem</label>
      <select id="raporDonemSecim" onchange="raporDonemDegisti(this.value)">
        <option value="bugun" ${raporDonemTipi==='bugun'?'selected':''}>Bugün</option>
        <option value="bu_hafta" ${raporDonemTipi==='bu_hafta'?'selected':''}>Bu Hafta</option>
        <option value="bu_ay" ${raporDonemTipi==='bu_ay'?'selected':''}>Bu Ay</option>
        <option value="ozel" ${raporDonemTipi==='ozel'?'selected':''}>Özel Tarih Aralığı</option>
      </select>
      ${raporDonemTipi==='ozel' ? `
        <div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label>Başlangıç</label><input id="raporBas" type="date" value="${raporBaslangic||todayISO()}" onchange="raporOzelTarihGuncelle()"></div>
          <div><label>Bitiş</label><input id="raporBit" type="date" value="${raporBitis||todayISO()}" onchange="raporOzelTarihGuncelle()"></div>
        </div>
      ` : ''}
      <p style="font-size:11.5px;color:var(--muted);margin:10px 0 0">
        Tablodaki bir müşteri veya ürün satırına dokunursan, o tarih aralığındaki tüm işlemlerinin
        ayrıntılı dökümünü (fatura kesmeye uygun) görürsün.
      </p>
    </div>
    <div id="raporSonuclari"></div>
  `;
  raporSeciliMusteri = null;
  raporSeciliUrun = null;
  renderRaporSonuclari();
}
function raporMusteriSec(mid){
  raporSeciliMusteri = mid;
  raporSeciliUrun = null;
  renderRaporSonuclari();
}
function raporUrunSec(tid){
  raporSeciliUrun = tid;
  raporSeciliMusteri = null;
  renderRaporSonuclari();
}
function raporDetayaKapat(){
  raporSeciliMusteri = null;
  raporSeciliUrun = null;
  renderRaporSonuclari();
}
function renderRaporSonuclari(){
  const kap = document.getElementById('raporSonuclari');
  if(!kap) return;
  const {bas, bit} = raporTarihAraligiHesapla();
  const kayitlar = DATA.kayitlar.filter(k=>k.tarih>=bas && k.tarih<=bit);

  // --- Tek müşteri detayı (fatura kesmeye uygun döküm) ---
  if(raporSeciliMusteri){
    if(!musteriBakiyeGorulebilir(raporSeciliMusteri)){ raporSeciliMusteri=null; renderRaporSonuclari(); return; }
    const satirlar = kayitlar.filter(k=>k.musteriId===raporSeciliMusteri).sort((a,b)=>a.tarih<b.tarih?-1:1);
    const toplam = satirlar.reduce((s,k)=>s+k.adet*k.birimFiyat,0);
    const urunToplam = {};
    satirlar.forEach(k=>{
      if(!urunToplam[k.turId]) urunToplam[k.turId] = {adet:0, tutar:0};
      urunToplam[k.turId].adet += k.adet;
      urunToplam[k.turId].tutar += k.adet*k.birimFiyat;
    });
    const urunToplamRows = Object.entries(urunToplam)
      .sort((a,b)=>b[1].tutar-a[1].tutar)
      .map(([tid,v])=>`<tr><td>${turAdi(tid)}</td><td>${v.adet}</td><td>₺${fmt(v.tutar)}</td></tr>`).join('');
    const rows = satirlar.map(k=>`
      <tr><td>${k.tarih}</td><td>${turAdi(k.turId)}</td><td>${k.adet}</td><td>₺${fmt(k.birimFiyat)}</td><td>₺${fmt(k.adet*k.birimFiyat)}</td></tr>
    `).join('');
    kap.innerHTML = `
      <div class="card" id="yazdirAlani">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h2 style="margin:0">${musteriAdi(raporSeciliMusteri)} — Dönem Dökümü</h2>
          <button class="iconbtn" onclick="raporDetayaKapat()" title="Kapat">✕</button>
        </div>
        <p style="font-size:12px;color:var(--muted);margin:4px 0 12px">${bas} — ${bit}</p>
        <div style="background:var(--wheat);color:#fff;border-radius:12px;padding:12px 16px;margin-bottom:14px;text-align:center">
          <div style="font-size:11px;opacity:.9">TOPLAM</div>
          <div style="font-size:22px;font-weight:700">₺${fmt(toplam)}</div>
        </div>
        <h3 style="font-size:13px;margin:0 0 8px">Ürün Bazlı Toplamlar</h3>
        <table style="margin-bottom:16px"><thead><tr><th>Ürün</th><th>Adet</th><th>Tutar</th></tr></thead>
        <tbody>${urunToplamRows}</tbody></table>
        <h3 style="font-size:13px;margin:0 0 8px">Tüm İşlemler</h3>
        <table><thead><tr><th>Tarih</th><th>Ürün</th><th>Adet</th><th>B.Fiyat</th><th>Tutar</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5"><div class="empty">Bu dönemde kayıt yok.</div></td></tr>`}</tbody></table>
        <div style="text-align:right;font-weight:700;font-size:16px;margin-top:12px;padding-top:12px;border-top:1.5px solid var(--card-border)">
          Toplam: ₺${fmt(toplam)}
        </div>
      </div>
      <button class="btn btn-primary btn-block" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button>
    `;
    return;
  }

  // --- Tek ürün detayı ---
  if(raporSeciliUrun){
    const satirlar = kayitlar.filter(k=>k.turId===raporSeciliUrun).sort((a,b)=>a.tarih<b.tarih?-1:1);
    const toplamAdet = satirlar.reduce((s,k)=>s+k.adet,0);
    const toplamTutar = satirlar.reduce((s,k)=>s+k.adet*k.birimFiyat,0);
    const rows = satirlar.filter(k=>musteriBakiyeGorulebilir(k.musteriId)).map(k=>`
      <tr><td>${k.tarih}</td><td>${musteriAdi(k.musteriId)}</td><td>${k.adet}</td><td>₺${fmt(k.birimFiyat)}</td><td>₺${fmt(k.adet*k.birimFiyat)}</td></tr>
    `).join('');
    kap.innerHTML = `
      <div class="card" id="yazdirAlani">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h2 style="margin:0">${turAdi(raporSeciliUrun)} — Dönem Dökümü</h2>
          <button class="iconbtn" onclick="raporDetayaKapat()" title="Kapat">✕</button>
        </div>
        <p style="font-size:12px;color:var(--muted);margin:4px 0 12px">${bas} — ${bit}</p>
        <div style="background:var(--wheat);color:#fff;border-radius:12px;padding:12px 16px;margin-bottom:14px;text-align:center">
          <div style="font-size:11px;opacity:.9">TOPLAM</div>
          <div style="font-size:22px;font-weight:700">${toplamAdet} adet — ₺${fmt(toplamTutar)}</div>
        </div>
        <table><thead><tr><th>Tarih</th><th>Müşteri</th><th>Adet</th><th>B.Fiyat</th><th>Tutar</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5"><div class="empty">Bu dönemde kayıt yok.</div></td></tr>`}</tbody></table>
        <div style="text-align:right;font-weight:700;font-size:16px;margin-top:12px;padding-top:12px;border-top:1.5px solid var(--card-border)">
          Toplam: ${toplamAdet} adet — ₺${fmt(toplamTutar)}
        </div>
      </div>
      <button class="btn btn-primary btn-block" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button>
    `;
    return;
  }

  // --- Genel özet (varsayılan görünüm) ---
  const odemeler = DATA.odemeler.filter(o=>o.tarih>=bas && o.tarih<=bit);
  const toplamCiro = kayitlar.reduce((s,k)=>s+k.adet*k.birimFiyat,0);
  const toplamAdet = kayitlar.reduce((s,k)=>s+k.adet,0);
  const toplamTahsilat = odemeler.reduce((s,o)=>s+o.tutar,0);

  const musteriToplam = {};
  kayitlar.forEach(k=>{
    if(!musteriToplam[k.musteriId]) musteriToplam[k.musteriId] = {adet:0, tutar:0};
    musteriToplam[k.musteriId].adet += k.adet;
    musteriToplam[k.musteriId].tutar += k.adet*k.birimFiyat;
  });
  const musteriRows = Object.entries(musteriToplam)
    .filter(([mid])=>musteriBakiyeGorulebilir(mid))
    .sort((a,b)=>b[1].tutar-a[1].tutar)
    .map(([mid,v])=>`<tr style="cursor:pointer" onclick="raporMusteriSec('${mid}')"><td>${musteriAdi(mid)}</td><td>${v.adet}</td><td>₺${fmt(v.tutar)}</td></tr>`).join('');

  const turToplam = {};
  kayitlar.forEach(k=>{
    if(!turToplam[k.turId]) turToplam[k.turId] = {adet:0, tutar:0};
    turToplam[k.turId].adet += k.adet;
    turToplam[k.turId].tutar += k.adet*k.birimFiyat;
  });
  const turRows = Object.entries(turToplam)
    .sort((a,b)=>b[1].tutar-a[1].tutar)
    .map(([tid,v])=>`<tr style="cursor:pointer" onclick="raporUrunSec('${tid}')"><td>${turAdi(tid)}</td><td>${v.adet}</td><td>₺${fmt(v.tutar)}</td></tr>`).join('');

  kap.innerHTML = `
    <div class="statRow">
      <div class="stat"><div class="n">₺${fmt(toplamCiro)}</div><div class="l">Toplam Ciro</div></div>
      <div class="stat"><div class="n">${toplamAdet}</div><div class="l">Toplam Adet</div></div>
      <div class="stat"><div class="n">₺${fmt(toplamTahsilat)}</div><div class="l">Tahsilat</div></div>
    </div>
    <div class="card">
      <h2>Müşteri Bazlı <span style="font-size:11px;color:var(--muted);font-weight:400">(detay için dokun)</span></h2>
      <table><thead><tr><th>Müşteri</th><th>Adet</th><th>Tutar</th></tr></thead>
      <tbody>${musteriRows || `<tr><td colspan="3"><div class="empty">Bu dönemde kayıt yok.</div></td></tr>`}</tbody></table>
    </div>
    <div class="card">
      <h2>Ürün Bazlı <span style="font-size:11px;color:var(--muted);font-weight:400">(detay için dokun)</span></h2>
      <table><thead><tr><th>Ürün</th><th>Adet</th><th>Tutar</th></tr></thead>
      <tbody>${turRows || `<tr><td colspan="3"><div class="empty">Bu dönemde kayıt yok.</div></td></tr>`}</tbody></table>
    </div>
  `;
}

/* ---------------- GİRİŞ ŞABLONU (hangi müşteri hangi ekmeği alıyor) ---------------- */
function renderSablonTab(main){
  if(!DATA.musteriler.length || !DATA.ekmekTurleri.length){
    main.innerHTML = `<div class="card"><div class="empty">Şablon oluşturmadan önce en az bir müşteri ve bir ekmek türü ekle.</div></div>`;
    return;
  }
  const satirlar = [...DATA.sablon].sort((a,b)=>(a.sira||0)-(b.sira||0));
  const rows = satirlar.map((s,i)=>{
    const m = DATA.musteriler.find(x=>x.id===s.musteriId);
    const t = DATA.ekmekTurleri.find(x=>x.id===s.turId);
    if(!m||!t) return '';
    const aktif = s.aktif !== false;
    return `<tr style="${aktif?'':'opacity:.45'}">
      <td>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--text)">
          <input type="checkbox" style="width:auto;margin:0" ${aktif?'checked':''} onchange="toggleSablonAktif('${s.id}')">
          ${aktif?'Aktif':'Pasif'}
        </label>
      </td>
      <td>${m.ad}</td>
      <td>${t.ad}</td>
      <td style="white-space:nowrap">
        <button class="rowDel" ${i===0?'disabled style="opacity:.25"':''} onclick="sablonYukari('${s.id}')" title="Yukarı">▲</button>
        <button class="rowDel" ${i===satirlar.length-1?'disabled style="opacity:.25"':''} onclick="sablonAsagi('${s.id}')" title="Aşağı">▼</button>
        <button class="rowDel" onclick="silSablonSatiri('${s.id}')" title="Kaldır">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  const musteriOpts = DATA.musteriler.map(m=>`<option value="${m.id}">${m.ad}</option>`).join('');
  const turOpts = DATA.ekmekTurleri.map(t=>`<option value="${t.id}">${t.ad}</option>`).join('');
  main.innerHTML = `
    <div class="card">
      <h2>Giriş Şablonu</h2>
      <p style="font-size:12px;color:var(--muted);margin:0 0 10px">
        Hangi müşterinin hangi ekmeği düzenli aldığını burada bir kere ayarla — "Günlük Giriş" ekranında
        her gün sadece adetleri gireceksin, müşteri/ürün seçmene gerek kalmayacak. Bir müşteri geçici olarak
        almıyorsa satırı silmene gerek yok, tikini kaldır (pasif yap), tekrar aldığında tekrar işaretlersin.
      </p>
      <table><thead><tr><th>Durum</th><th>Müşteri</th><th>Ekmek Türü</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4"><div class="empty">Henüz şablon satırı yok.</div></td></tr>`}</tbody></table>
    </div>
    <div class="card">
      <h2>Satır Ekle</h2>
      <label>Müşteri</label>
      <select id="sablonMusteri">${musteriOpts}</select>
      <label>Ekmek Türü</label>
      <select id="sablonTur">${turOpts}</select>
      <button class="btn btn-primary btn-block" onclick="sablonSatiriEkle()">+ Ekle</button>
    </div>
  `;
}
function sablonSatiriEkle(){
  const musteriId = document.getElementById('sablonMusteri').value;
  const turId = document.getElementById('sablonTur').value;
  const zatenVar = DATA.sablon.some(s=>s.musteriId===musteriId && s.turId===turId);
  if(zatenVar){ toast('Bu müşteri + ürün eşleşmesi zaten şablonda var'); return; }
  const maxSira = DATA.sablon.reduce((m,s)=>Math.max(m, s.sira||0), 0);
  DATA.sablon.push({id:'s_'+Date.now(), musteriId, turId, sira:maxSira+1, aktif:true});
  persist(); toast('Eklendi ✓'); renderTab('sablon');
}
function toggleSablonAktif(id){
  const s = DATA.sablon.find(x=>x.id===id);
  s.aktif = !(s.aktif !== false);
  persist(); renderTab('sablon');
}
function silSablonSatiri(id){
  DATA.sablon = DATA.sablon.filter(s=>s.id!==id);
  persist(); toast('Kaldırıldı ✓'); renderTab('sablon');
}
function sablonYukari(id){
  const satirlar = [...DATA.sablon].sort((a,b)=>(a.sira||0)-(b.sira||0));
  const idx = satirlar.findIndex(s=>s.id===id);
  if(idx<=0) return;
  [satirlar[idx-1].sira, satirlar[idx].sira] = [satirlar[idx].sira, satirlar[idx-1].sira];
  persist(); renderTab('sablon');
}
function sablonAsagi(id){
  const satirlar = [...DATA.sablon].sort((a,b)=>(a.sira||0)-(b.sira||0));
  const idx = satirlar.findIndex(s=>s.id===id);
  if(idx>=satirlar.length-1) return;
  [satirlar[idx+1].sira, satirlar[idx].sira] = [satirlar[idx].sira, satirlar[idx+1].sira];
  persist(); renderTab('sablon');
}

/* ---------------- GÜNLÜK GİRİŞ (kolay, hızlı adet girişi) ---------------- */
let girisTarih = todayISO();
window.girisAdetleri = {}; // {sablonId: adet} — window'a bağlı: inline oninput/onchange bunlara doğrudan erişebilsin
window.girisOdendi = {};   // {musteriId: true|false}
function degistirGunlukGirisTarihi(val){
  girisTarih = val || todayISO();
  window.girisAdetleri = {};
  window.girisOdendi = {};
  renderTab('gunlukgiris');
}
function gunlukGirisGrupla(){
  const aktifSatirlar = [...DATA.sablon].filter(s=>s.aktif!==false).sort((a,b)=>(a.sira||0)-(b.sira||0));
  const gruplar = [];
  const indexMap = {};
  aktifSatirlar.forEach(s=>{
    if(indexMap[s.musteriId]==null){
      indexMap[s.musteriId] = gruplar.length;
      gruplar.push({musteriId:s.musteriId, satirlar:[]});
    }
    gruplar[indexMap[s.musteriId]].satirlar.push(s);
  });
  return gruplar;
}
function renderGunlukGirisTab(main){
  if(!DATA.sablon.length){
    main.innerHTML = `
      <div class="card">
        <div class="empty">Henüz bir Giriş Şablonu oluşturmadın.</div>
        <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="renderTab('sablon')">🗂️ Giriş Şablonu Oluştur</button>
      </div>`;
    return;
  }
  const gruplar = gunlukGirisGrupla();
  const gecmisMi = girisTarih !== todayISO();
  const gruplarHtml = gruplar.map(g=>{
    const m = DATA.musteriler.find(x=>x.id===g.musteriId);
    if(!m) return '';
    const odendi = window.girisOdendi[g.musteriId]===undefined ? false : window.girisOdendi[g.musteriId];
    const hucreler = g.satirlar.map(s=>{
      const t = DATA.ekmekTurleri.find(x=>x.id===s.turId);
      if(!t) return '';
      const deger = window.girisAdetleri[s.id];
      return `
      <div style="margin-bottom:8px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px">${t.ad}</div>
        <input type="number" min="0" inputmode="numeric" placeholder="—" value="${deger===undefined||deger===''?'':deger}"
          oninput="window.girisAdetleri['${s.id}']=this.value===''?'':Number(this.value)"
          style="margin-bottom:0;padding:9px 8px;text-align:center;font-weight:600;">
      </div>`;
    }).join('');
    return `
    <div class="card" style="margin-bottom:0;padding:14px">
      <div style="margin-bottom:8px">
        <b style="font-size:14px">${m.ad}</b>
        <label style="font-size:11px;font-weight:500;display:flex;align-items:center;gap:4px;white-space:nowrap;color:var(--text);margin-top:4px">
          <input type="checkbox" style="width:auto;margin:0" ${odendi?'checked':''} onchange="window.girisOdendi['${g.musteriId}']=this.checked">
          Bugün Ödendi
        </label>
      </div>
      ${hucreler}
    </div>`;
  }).join('');
  main.innerHTML = `
    <div class="card">
      <h2>Günlük Giriş</h2>
      <label>Tarih</label>
      <input type="date" value="${girisTarih}" max="${todayISO()}" onchange="degistirGunlukGirisTarihi(this.value)">
      ${gecmisMi ? `<p style="font-size:11.5px;color:var(--crust);margin:0">📅 Geçmiş bir tarih için giriş yapıyorsun.</p>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">${gruplarHtml}</div>
    <button class="btn btn-primary btn-block" onclick="gunlukGirisKaydet()">✓ Tümünü Kaydet</button>
  `;
}
function gunlukGirisKaydet(){
  let eklenen = 0;
  const gruplar = gunlukGirisGrupla();
  gruplar.forEach(g=>{
    const odendi = window.girisOdendi[g.musteriId]===undefined ? false : window.girisOdendi[g.musteriId];
    g.satirlar.forEach(s=>{
      const adet = window.girisAdetleri[s.id];
      if(!adet || adet<=0) return;
      const t = DATA.ekmekTurleri.find(x=>x.id===s.turId);
      DATA.kayitlar.push({
        id:'k_'+Date.now()+'_'+s.id, musteriId:g.musteriId, turId:s.turId,
        adet, birimFiyat:birimFiyatHesapla(g.musteriId, s.turId), tarih:girisTarih, odendi
      });
      eklenen++;
      window.girisAdetleri[s.id] = '';
    });
  });
  if(eklenen===0){ toast('Adet girilen satır yok.'); return; }
  persist();
  gruplar.forEach(g=>musteriPortalSenkronEt(g.musteriId));
  toast(`${eklenen} satır kaydedildi ✓`);
  renderTab('gunlukgiris');
}

/* ---------------- PERSONEL (sadece patron yönetir) ---------------- */
function renderPersonelTab(main){
  const personeller = DATA.users.filter(u=>u.role==='personel');
  const rows = personeller.map(u=>{
    const izinliSayisi = (u.gorebilecegiMusteriler||[]).length;
    return `<tr>
      <td>${u.ad}</td>
      <td>${u.email}</td>
      <td>${izinliSayisi} müşteri</td>
      <td class="rowActions">
        <button class="iconbtn" onclick="editPersonelModal('${u.id}')">✏️</button>
        <button class="iconbtn" onclick="silPersonel('${u.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  main.innerHTML = `
    <div class="card">
      <h2>Personel</h2>
      <p style="font-size:12px;color:var(--muted);margin:-4px 0 10px">
        Personel, her müşteri için günlük giriş yapabilir ama sadece burada işaretlediğin
        müşterilerin bakiye/borç bilgisini görebilir. Diğer müşteriler onun için gizli kalır.
      </p>
      <table><thead><tr><th>Ad</th><th>Kullanıcı Adı</th><th>Görebildiği Müşteri</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4"><div class="empty">Henüz personel eklenmedi.</div></td></tr>`}</tbody></table>
      <button class="btn btn-primary" style="margin-top:14px" onclick="editPersonelModal(null)">+ Yeni Personel</button>
    </div>
    <div class="card">
      <h2 style="font-size:14px">⚠️ Önemli Not</h2>
      <p style="font-size:12.5px;color:var(--muted);margin:0">
        Buraya eklediğin personel, ayrıca Firebase Authentication'da da bir hesaba sahip olmalı
        (kullanıcı adı + <code>@veresiyetakip.local</code> uzantılı e-posta ve bir şifre) —
        Firebase Console → Authentication → Users → Add user'dan açabilirsin. Buradaki kayıt
        sadece rolünü ve yetkisini belirler, şifre burada tutulmaz.
      </p>
    </div>
  `;
}
function editPersonelModal(id){
  const u = id ? DATA.users.find(x=>x.id===id) : {ad:'', email:'', gorebilecegiMusteriler:[]};
  const musteriListesi = DATA.musteriler.map(m=>{
    const secili = (u.gorebilecegiMusteriler||[]).includes(m.id);
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed var(--card-border);font-weight:400;color:var(--text);font-size:13.5px">
      <input type="checkbox" class="personelMusteriTik" value="${m.id}" style="width:auto;margin:0" ${secili?'checked':''}>
      ${m.ad}
    </label>`;
  }).join('');
  showModal(`
    <button class="modalClose" onclick="closeModal()">✕</button>
    <h3>${id?'Personeli Düzenle':'Yeni Personel'}</h3>
    <label>Ad Soyad</label>
    <input id="pAd" value="${u.ad||''}" placeholder="örn: Ahmet Yılmaz">
    <label>Kullanıcı Adı</label>
    <input id="pKullanici" value="${u.email||''}" placeholder="örn: ahmet" ${id?'disabled style="opacity:.6"':''}>
    ${id?'<p style="font-size:11px;color:var(--muted);margin:-8px 0 12px">Kullanıcı adı sonradan değiştirilemez.</p>':''}
    <label style="margin-top:6px">Bakiye/Borcunu Görebileceği Müşteriler</label>
    <div style="max-height:220px;overflow-y:auto;border:1.5px solid var(--card-border);border-radius:10px;padding:8px 12px;margin-bottom:14px">
      ${musteriListesi || '<p style="font-size:12.5px;color:var(--muted)">Henüz müşteri yok.</p>'}
    </div>
    <button class="btn btn-primary btn-block" onclick="savePersonel('${id||''}')">Kaydet</button>
  `);
}
function savePersonel(id){
  const ad = document.getElementById('pAd').value.trim();
  const kullaniciAdi = document.getElementById('pKullanici').value.trim();
  const gorebilecegiMusteriler = Array.from(document.querySelectorAll('.personelMusteriTik:checked')).map(el=>el.value);
  if(!ad){ toast('Ad gerekli'); return; }
  if(!kullaniciAdi){ toast('Kullanıcı adı gerekli'); return; }
  if(id){
    const u = DATA.users.find(x=>x.id===id);
    Object.assign(u, {ad, gorebilecegiMusteriler});
  } else {
    const zatenVar = DATA.users.some(x=>x.email.toLowerCase()===kullaniciAdi.toLowerCase());
    if(zatenVar){ toast('Bu kullanıcı adı zaten kullanılıyor'); return; }
    DATA.users.push({id:'u_'+Date.now(), email:kullaniciAdi, ad, role:'personel', gorebilecegiMusteriler});
  }
  persist(); closeModal(); toast('Kaydedildi ✓'); renderTab('personel');
}
function silPersonel(id){
  if(!confirm('Bu personeli silmek istediğine emin misin?')) return;
  DATA.users = DATA.users.filter(u=>u.id!==id);
  persist(); toast('Silindi ✓'); renderTab('personel');
}

document.getElementById('modalBg').addEventListener('click', e=>{
  if(e.target.id==='modalBg') closeModal();
});

// ---------------------------------------------------------------------
// Vite bu dosyayı bir ES modülü olarak yüklüyor; modül içindeki fonksiyonlar
// varsayılan olarak global (window) alana açılmıyor. Ancak HTML tarafındaki
// tüm onclick="..." / onchange="..." gibi eski usül çağrılar bu fonksiyonların
// window üzerinde bulunmasını bekliyor. Bu yüzden aşağıda TÜM üst seviye
// fonksiyonları tek tek window'a bağlıyoruz.
// ---------------------------------------------------------------------
window.acGenelOdemeModal = acGenelOdemeModal;
window.acYeniKayitModal = acYeniKayitModal;
window.baglantiRozetiGuncelle = baglantiRozetiGuncelle;
window.birimFiyatHesapla = birimFiyatHesapla;
window.buildTabs = buildTabs;
window.canliSenkronuBaslat = canliSenkronuBaslat;
window.closeModal = closeModal;
window.degistirGunlukGirisTarihi = degistirGunlukGirisTarihi;
window.demoLoad = demoLoad;
window.demoSave = demoSave;
window.demoSeed = demoSeed;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.editKayitModal = editKayitModal;
window.editMusteriModal = editMusteriModal;
window.editPersonelModal = editPersonelModal;
window.editTurModal = editTurModal;
window.enterApp = enterApp;
window.fabAction = fabAction;
window.firestoreVerisiniYukle = firestoreVerisiniYukle;
window.fmt = fmt;
window.gecmisFiyatDuzelt = gecmisFiyatDuzelt;
window.gorunurBakiyeMusteriIdleri = gorunurBakiyeMusteriIdleri;
window.gunlukGirisGrupla = gunlukGirisGrupla;
window.gunlukGirisKaydet = gunlukGirisKaydet;
window.isPatron = isPatron;
window.kaydetGenelOdeme = kaydetGenelOdeme;
window.kaydetOdeme = kaydetOdeme;
window.kaydetTopluMusteri = kaydetTopluMusteri;
window.kaydetYeniKayit = kaydetYeniKayit;
window.kayitFiyatGuncelle = kayitFiyatGuncelle;
window.kullaniciAdiCoz = kullaniciAdiCoz;
window.musteriAdi = musteriAdi;
window.musteriAramaFiltrele = musteriAramaFiltrele;
window.musteriAramaGuncelle = musteriAramaGuncelle;
window.musteriAramaHtml = musteriAramaHtml;
window.musteriAramaSec = musteriAramaSec;
window.musteriBakiye = musteriBakiye;
window.musteriBakiyeGorulebilir = musteriBakiyeGorulebilir;
window.musteriEtiketToId = musteriEtiketToId;
window.musteriPortalSenkronEt = musteriPortalSenkronEt;
window.musteriSatirlariniOlustur = musteriSatirlariniOlustur;
window.musteriToplamBorc = musteriToplamBorc;
window.musteriToplamOdenen = musteriToplamOdenen;
window.odemeAlModal = odemeAlModal;
window.odemeGecmisiModal = odemeGecmisiModal;
window.persist = persist;
window.portalLinkKopyala = portalLinkKopyala;
window.portalWhatsappGonder = portalWhatsappGonder;
window.raporDetayaKapat = raporDetayaKapat;
window.raporDonemDegisti = raporDonemDegisti;
window.raporMusteriSec = raporMusteriSec;
window.raporOzelTarihGuncelle = raporOzelTarihGuncelle;
window.raporTarihAraligiHesapla = raporTarihAraligiHesapla;
window.raporUrunSec = raporUrunSec;
window.rastgeleErisimKodu = rastgeleErisimKodu;
window.renderBorclarTab = renderBorclarTab;
window.renderGunlukGirisTab = renderGunlukGirisTab;
window.renderKayitTablosu = renderKayitTablosu;
window.renderKayitlarTab = renderKayitlarTab;
window.renderMusteriMiniListe = renderMusteriMiniListe;
window.renderMusterilerTab = renderMusterilerTab;
window.renderOzetTab = renderOzetTab;
window.renderPersonelTab = renderPersonelTab;
window.renderRaporSonuclari = renderRaporSonuclari;
window.renderRaporlarTab = renderRaporlarTab;
window.renderSablonTab = renderSablonTab;
window.renderTab = renderTab;
window.renderTurlerTab = renderTurlerTab;
window.sablonAsagi = sablonAsagi;
window.sablonSatiriEkle = sablonSatiriEkle;
window.sablonYukari = sablonYukari;
window.saveEditKayit = saveEditKayit;
window.saveMusteri = saveMusteri;
window.savePersonel = savePersonel;
window.saveTur = saveTur;
window.semaGuvenceyeAl = semaGuvenceyeAl;
window.showModal = showModal;
window.silKayit = silKayit;
window.silMusteri = silMusteri;
window.silPersonel = silPersonel;
window.silSablonSatiri = silSablonSatiri;
window.silTur = silTur;
window.toAuthEmail = toAuthEmail;
window.toast = toast;
window.todayISO = todayISO;
window.toggleSablonAktif = toggleSablonAktif;
window.topluMusteriEkleModal = topluMusteriEkleModal;
window.turAdi = turAdi;
