const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const rp=n=>'Rp '+Number(n).toLocaleString('id-ID');
const U=id=>`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=80`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lt=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4);
const today=lt().toISOString().slice(0,10);
const fd=d=>new Date(d+'T00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const ini=n=>n.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const STAT=['Menunggu pembayaran','Pembayaran berhasil','Selesai','Dibatalkan'];

const seed=()=>({
 dest:[
  {id:'d1',name:'Labuan Bajo',region:'Nusa Tenggara Timur',cat:'Bahari',rating:4.9,visits:5200,img:U('1516690561799-46d8f74f9abf'),desc:'Pulau eksotis dan laut sebening kristal.'},
  {id:'d2',name:'Ubud',region:'Bali',cat:'Budaya',rating:4.8,visits:4400,img:U('1537996194471-e657df975ab4'),desc:'Seni, sawah hijau, dan suasana yang menenangkan.'},
  {id:'d3',name:'Bromo Tengger',region:'Jawa Timur',cat:'Alam',rating:4.8,visits:3300,img:U('1500530855697-b586d89ba3ee'),desc:'Lautan pasir dan matahari terbit di pegunungan.'},
  {id:'d4',name:'Raja Ampat',region:'Papua Barat Daya',cat:'Bahari',rating:5.0,visits:2400,img:U('1544551763-46a013bb70d5'),desc:'Surga bawah laut dengan gugusan pulau hijau.'},
  {id:'d5',name:'Yogyakarta',region:'DI Yogyakarta',cat:'Budaya',rating:4.7,visits:3000,img:U('1596402184320-417e7178b2cd'),desc:'Warisan budaya, candi, dan kuliner khas.'},
  {id:'d6',name:'Danau Toba',region:'Sumatera Utara',cat:'Alam',rating:4.8,visits:2100,img:U('1501785888041-af3ef285b470'),desc:'Danau vulkanik luas dengan pemandangan menawan.'}],
 pkg:[
  {id:'p1',name:'Sailing Komodo',dest:'d1',dur:'4H 3M',max:10,price:3850000,tag:'Petualangan pilihan',img:'',desc:'Berlayar antar pulau, snorkeling, dan panorama Komodo.'},
  {id:'p2',name:'Ubud Slow Escape',dest:'d2',dur:'3H 2M',max:8,price:2150000,tag:'Paling diminati',img:'',desc:'Budaya, sawah, kuliner lokal, dan waktu santai di Ubud.'},
  {id:'p3',name:'Bromo After Dark',dest:'d3',dur:'2H 1M',max:12,price:1250000,tag:'Keberangkatan baru',img:'',desc:'Berburu matahari terbit dan lanskap vulkanik Bromo.'},
  {id:'p4',name:'Raja Ampat Blue Journey',dest:'d4',dur:'5H 4M',max:8,price:5250000,tag:'Lautan biru',img:'',desc:'Island hopping dan snorkeling bersama pemandu lokal.'},
  {id:'p5',name:'Yogyakarta Heritage Trail',dest:'d5',dur:'3H 2M',max:10,price:1750000,tag:'Jejak budaya',img:'',desc:'Menyusuri candi, kerajinan, dan kuliner khas Yogyakarta.'}],
 book:[{id:'NSA-250681',pkg:'p1',name:'Dzaky Alfareza',email:'dzaki@gmail.com',date:new Date(Date.now()+30*864e5).toISOString().slice(0,10),guests:2,total:7700000,status:'Pembayaran berhasil',notes:''}],
 rev:[],fav:[],user:{name:'Dzaky Alfareza',email:'dzaki@gmail.com'},trend:[62,75,70,92,108,128,143]
});
let db;try{db=JSON.parse(localStorage.getItem('nusa'))||seed()}catch{db=seed()}
const save=()=>{try{localStorage.setItem('nusa',JSON.stringify(db))}catch{}};
const D=id=>db.dest.find(x=>x.id===id),P=id=>db.pkg.find(x=>x.id===id),B=id=>db.book.find(x=>x.id===id);
const pimg=p=>p.img||D(p.dest)?.img||'';
const paid=()=>db.book.filter(b=>['Pembayaran berhasil','Selesai'].includes(b.status));
let view='home',cat='Semua',q='',selDate='',tab='book',atab='sum',rate=5;
let auth=null;try{auth=JSON.parse(sessionStorage.getItem('nusaAuth'))}catch{}
const AUTH_API='../api/auth.php';
const DATA_API='../api/data.php';
async function authRequest(action,data={}){
 const body=new URLSearchParams({action,...data});
 const response=await fetch(`${AUTH_API}?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,credentials:'same-origin'});
 let result={};
 try{result=await response.json()}catch{throw new Error('Server autentikasi tidak merespons')}
 if(!response.ok||!result.success)throw new Error(result.message||'Permintaan autentikasi gagal');
 return result;
}

async function dataRequest(action,data={}){
 const body=new URLSearchParams({action,...data});
 const response=await fetch(`${DATA_API}?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,credentials:'same-origin'});
 let result={};
 try{result=await response.json()}catch{throw new Error('Server data tidak merespons')}
 if(!response.ok||!result.success)throw new Error(result.message||'Permintaan data gagal');
 return result;
}

async function loadDatabaseDestinations(){
 try{
  const result=await dataRequest('list-destinations');
  result.destinations.forEach(destination=>{
   const local=db.dest.find(d=>d.id===destination.id);
   if(local)Object.assign(local,destination);
   else db.dest.push(destination);
  });
  save();renderDest();
 }catch(error){console.error(error)}
}

function syncAuthenticatedUser(){
 if(!auth)return;
 db.user={name:auth.name,email:auth.email,phone:auth.phone||''};
}

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),3200)}
function modal(h){$('#box').innerHTML=`<button class="x" data-act="close" aria-label="Tutup">×</button>`+h;$('#modal').hidden=false}
function closeModal(){if(!auth){return}$('#modal').hidden=true;$('#modal').classList.remove('login-modal')}
function openLogin(){
 modal(`<div class="login-shell"><div class="login-visual"><div class="login-brand"><span class="logo">◎</span>Nusa.</div><div class="login-collage"><img src="${U('1516690561799-46d8f74f9abf')}" alt="Destinasi bahari Indonesia"><img src="${U('1537996194471-e657df975ab4')}" alt="Ubud Bali"><img src="${U('1544551763-46a013bb70d5')}" alt="Raja Ampat"></div><div class="login-quote"><p>Temukan cerita di setiap perjalanan.</p><span>Destinasi pilihan untuk petualanganmu</span></div></div><div class="login-card"><div id="loginPanel"><p class="label">Masuk ke Nusa Wisata</p><h2>Selamat datang kembali</h2><p class="sub">Masuk dengan akun pengguna atau administrator.</p><form id="fLogin" class="fg"><div class="login-tabs full"><button type="button" class="on" data-login-role="user">Pengguna</button><button type="button" data-login-role="admin">Admin</button></div><label class="full">Email<input name="email" type="email" required autocomplete="email"></label><label class="full">Password<input name="password" type="password" required autocomplete="current-password"></label><input type="hidden" name="role" value="user"><button class="btn full">Masuk</button></form><button class="auth-switch full" type="button" data-open-register>Belum punya akun? Daftar sekarang</button></div><div id="registerPanel" hidden><p class="label">Daftar akun pengguna</p><h2>Buat akun baru</h2><p class="sub">Informasi akun akan disimpan ke database Nusa Wisata.</p><form id="fRegister" class="fg"><label class="full">Nama lengkap<input name="name" required maxlength="100" autocomplete="name"></label><label>Email<input name="email" type="email" required maxlength="120" autocomplete="email"></label><label>No. telepon<input name="phone" required maxlength="20" autocomplete="tel" pattern="[0-9+ -]+"></label><label>Password<input name="password" type="password" minlength="6" required autocomplete="new-password"></label><label>Konfirmasi password<input name="password_confirmation" type="password" minlength="6" required autocomplete="new-password"></label><button class="btn full">Buat akun</button></form><button class="auth-switch full" type="button" data-open-login>Kembali ke login</button></div></div></div>`);
 $('#box').classList.add('login-card-wrap');
 $('#modal').classList.add('login-modal');
 $$('[data-login-role]').forEach(b=>b.onclick=()=>{
  const role=b.dataset.loginRole;
  $$('[data-login-role]').forEach(x=>x.classList.toggle('on',x===b));
  $('#fLogin [name=role]').value=role;
 });
 $('[data-open-register]').onclick=()=>{$('#loginPanel').hidden=true;$('#registerPanel').hidden=false};
 $('[data-open-login]').onclick=()=>{$('#registerPanel').hidden=true;$('#loginPanel').hidden=false};
 $('#fLogin').onsubmit=async e=>{
  e.preventDefault();
  try{
   const result=await authRequest('login',{email:e.target.elements.email.value,password:e.target.elements.password.value});
   if(e.target.elements.role.value!==result.user.role){throw new Error(result.user.role==='admin'?'Gunakan pilihan tab Admin untuk masuk sebagai administrator.':'Gunakan pilihan tab Pengguna untuk masuk sebagai pengguna.')}
   auth={role:result.user.role,name:result.user.name,email:result.user.email,phone:result.user.phone||''};
   sessionStorage.setItem('nusaAuth',JSON.stringify(auth));syncAuthenticatedUser();$('#box').classList.remove('login-card-wrap');closeLoginSession();applyRole();toast('Login berhasil');go(auth.role==='admin'?'admin':'home');
  }catch(error){toast(error.message)}
 };
 $('#fRegister').onsubmit=async e=>{
  e.preventDefault();
  try{
   const form=e.target;
   const result=await authRequest('register',{name:form.elements.name.value,email:form.elements.email.value,phone:form.elements.phone.value,password:form.elements.password.value,password_confirmation:form.elements.password_confirmation.value});
   auth={role:result.user.role,name:result.user.name,email:result.user.email,phone:result.user.phone||''};
   sessionStorage.setItem('nusaAuth',JSON.stringify(auth));syncAuthenticatedUser();$('#box').classList.remove('login-card-wrap');closeLoginSession();applyRole();toast(result.message);go('home');
  }catch(error){toast(error.message)}
 };
}
function closeLoginSession(){ $('#modal').hidden=true;$('#modal').classList.remove('login-modal') }
function logout(){fetch(`${AUTH_API}?action=logout`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'action=logout',credentials:'same-origin'}).catch(()=>{});auth=null;sessionStorage.removeItem('nusaAuth');applyRole();openLogin()}
function applyRole(){const portal=$$('.plink');portal.forEach(x=>x.hidden=!auth||auth.role!== 'admin');const account=$$('.pill');account.forEach(x=>{x.textContent=auth?.role==='admin'?'Portal Mitra':'Akun Saya'})}
function go(v){
 if(!auth){openLogin();return}
 if(v==='admin'&&auth.role!== 'admin'){toast('Portal Mitra hanya untuk akun admin');openLogin();return}
 if(v==='home'&&auth.role==='admin'){v='admin'}view=v;closeLoginSession();$('#vHome').hidden=v!=='home';$('#vAcc').hidden=v!=='akun';$('#vAdm').hidden=v!=='admin';$('#top').hidden=v==='admin';$('#foot').hidden=v==='admin';$('#nav').classList.remove('open');applyRole();
 if(v==='home'){renderDest();renderPkg()}if(v==='akun'){loadDatabaseBookings();renderAcc()}if(v==='admin'){loadDatabaseBookings();renderAdm()}scrollTo(0,0)}

/* ---------- Beranda ---------- */
function renderDest(){
 const l=db.dest.filter(d=>(cat==='Semua'||(cat==='Favorit'?db.fav.includes(d.id):d.cat===cat))&&(d.name+d.region+d.desc).toLowerCase().includes(q.toLowerCase()));
 $('#chips').innerHTML=['Semua','Bahari','Budaya','Alam','Favorit'].map(c=>`<button class="chip ${c===cat?'on':''}" data-act="cat" data-v="${c}">${c}${c==='Favorit'?' ('+db.fav.length+')':''}</button>`).join('');
 $('#destGrid').innerHTML=l.length?l.map(d=>`<article class="dest"><img src="${esc(d.img)}" alt="${esc(d.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&amp;fit=crop&amp;w=1000&amp;q=80'"><button class="heart ${db.fav.includes(d.id)?'on':''}" data-act="fav" data-id="${d.id}" aria-label="Simpan ke favorit">♥</button><div class="di"><div class="dm"><span>${esc(d.cat)}</span><b>★ ${d.rating}</b></div><h3>${esc(d.name)}</h3><p>${esc(d.region)}. ${esc(d.desc)}</p><button class="mini" data-act="bookdest" data-id="${d.id}">Lihat paket</button></div></article>`).join(''):`<div class="empty">${cat==='Favorit'?'Belum ada favorit. Ketuk ikon hati pada destinasi untuk menyimpannya.':'Tidak ada destinasi yang cocok. Coba kata kunci lain atau pilih kategori Semua.'}</div>`}
function renderPkg(){$('#pkgList').innerHTML=db.pkg.map(p=>`<article class="pkg"><img src="${esc(pimg(p))}" alt="" loading="lazy"><div class="pi"><span class="tag">${esc(p.tag)}</span><h3>${esc(p.name)}</h3><small>${esc(p.dur)} · Maks. ${p.max} tamu</small><div class="pr">Mulai dari<b>${rp(p.price)} <span style="font-weight:400;font-size:15px">/ pax</span></b></div></div><button class="arrow" data-act="book" data-id="${p.id}" aria-label="Pesan ${esc(p.name)}">→</button></article>`).join('')||'<div class="empty">Belum ada paket tersedia.</div>'}

/* ---------- Pemesanan ---------- */
function openBook(pid){
 if(!db.pkg.length)return toast('Belum ada paket tersedia');
 syncAuthenticatedUser();
 modal(`<h2>Pesan perjalananmu</h2><p class="sub">Isi data pemesan. Pembayaran dilakukan dari halaman Akun Saya.</p><form id="fB" class="fg"><label class="full">Paket<select name="pkg">${db.pkg.map(p=>`<option value="${p.id}" ${p.id===pid?'selected':''}>${esc(p.name)} — ${rp(p.price)}/pax</option>`).join('')}</select></label><label>Nama lengkap<input name="name" required value="${esc(auth?.name||db.user.name)}"></label><label>Email<input name="email" type="email" required value="${esc(auth?.email||db.user.email)}"></label><label>Tanggal berangkat<input name="date" type="date" required min="${today}" value="${selDate>=today?selDate:''}"></label><label>Jumlah peserta<input name="guests" type="number" min="1" value="2" required></label><label class="full">Catatan<textarea name="notes" rows="2" placeholder="Alergi, permintaan khusus, dll."></textarea></label><div class="sum full" id="sum"></div><button class="btn full">Buat pemesanan</button></form>`);
 const f=$('#fB'),v=n=>f.elements[n].value;
 const upd=()=>{const p=P(v('pkg')),g=Math.max(1,+v('guests')||1);$('#sum').innerHTML=`${g} peserta × ${rp(p.price)} = <b>${rp(p.price*g)}</b>${g>p.max?`<br><span class="warn">Paket ini maksimal ${p.max} tamu.</span>`:''}`};
 f.oninput=upd;upd();
 f.onsubmit=async e=>{e.preventDefault();const p=P(v('pkg')),g=Math.floor(+v('guests'));if(g>p.max||g<1)return toast(`Jumlah peserta harus 1–${p.max}`);
  try{
   const result=await dataRequest('create-booking',{name:v('name').trim(),email:v('email').trim(),package_name:p.name,package_id:p.id,date:v('date'),guests:g,total:p.price*g,notes:v('notes').trim()});
   db.user={name:v('name').trim(),email:v('email').trim()};
   db.book.unshift(result.booking);save();tab='book';closeModal();await loadDatabaseBookings();go('akun');toast('Pemesanan dibuat dan tersimpan di database.');
  }catch(error){toast(error.message)}
 }}

/* ---------- Akun ---------- */
const sc=s=>s==='Dibatalkan'?'bad':s==='Menunggu pembayaran'?'wait':'ok';
function bookCard(b){const p=P(b.pkg)||{name:'Paket sudah dihapus',img:'',dest:''};
 return `<article class="bk"><img src="${esc(pimg(p))}" alt=""><div class="bb"><div class="row"><span class="st ${sc(b.status)}">${b.status}</span><span>${b.id}</span></div><h3>${esc(p.name)}</h3><p>${fd(b.date)} · ${b.guests} peserta · ${rp(b.total)}</p><div class="acts">${b.status==='Pembayaran berhasil'?`<button class="btn dk" data-act="ticket" data-id="${b.id}">Lihat e-tiket</button>`:''}${b.status==='Menunggu pembayaran'?`<button class="btn dk" data-act="pay" data-id="${b.id}">Bayar sekarang</button><button class="ghost" data-act="cancel" data-id="${b.id}">Batalkan</button>`:''}<button class="ghost" data-act="detail" data-id="${b.id}">Detail perjalanan</button></div></div></article>`}
function renderAcc(){
 syncAuthenticatedUser();
 $('#accName').textContent=auth?.name||db.user.name;$('#av').textContent=ini(auth?.name||db.user.name);
 $$('#accNav button').forEach(b=>b.classList.toggle('on',b.dataset.v===tab));
 const m=$('#accMain');
 if(tab==='book'){const up=db.book.filter(b=>b.date>=today&&b.status!=='Dibatalkan'&&b.status!=='Selesai'),hs=db.book.filter(b=>!up.includes(b));
  m.innerHTML=`<h2>Perjalanan mendatang</h2>`+(up.map(bookCard).join('')||`<div class="empty">Belum ada perjalanan mendatang. <button class="lk" data-act="sec" data-v="paket">Pilih paket wisata</button></div>`)+(hs.length?`<h3 class="sub" style="font-family:var(--serif);font-weight:400">Riwayat</h3>`+hs.map(bookCard).join(''):'')}
 if(tab==='rev'){const ok=paid();
  m.innerHTML=`<h2>Ulasan &amp; rating</h2><div class="card">${ok.length?`<form id="fR" class="fg" style="margin:0"><label class="full">Perjalanan<select name="b">${ok.map(b=>`<option value="${b.id}">${esc(P(b.pkg)?.name||b.id)} — ${fd(b.date)}</option>`).join('')}</select></label><div class="full stars" id="stars"></div><label class="full">Ceritakan pengalamanmu<textarea name="t" rows="3" required></textarea></label><button class="btn full">Kirim ulasan</button></form>`:`<span class="sub">Ulasan bisa ditulis setelah pembayaran berhasil.</span>`}</div><div class="card">${db.rev.map(r=>`<div class="rv"><b>${'★'.repeat(r.r)}</b> ${esc(r.pkg)}<br>${esc(r.t)}<br><small class="sub">${esc(r.name)} · ${fd(r.d)}</small></div>`).join('')||'<span class="sub">Belum ada ulasan.</span>'}</div>`;
  const f=$('#fR');if(f){stars();f.onsubmit=e=>{e.preventDefault();const b=B(f.elements.b.value);db.rev.unshift({r:rate,t:f.elements.t.value.trim(),pkg:P(b.pkg)?.name||b.id,name:db.user.name,d:today});save();renderAcc();toast('Ulasan terkirim. Terima kasih!')}}}
 if(tab==='prof'){
  m.innerHTML=`<h2>Profil &amp; keamanan</h2><div class="card"><form id="fP" class="fg" style="margin:0"><label>Nama lengkap<input name="n" required value="${esc(auth?.name||db.user.name)}"></label><label>Email<input name="e" type="email" required value="${esc(auth?.email||db.user.email)}"></label><label class="full">No. telepon<input name="phone" type="tel" maxlength="20" pattern="[0-9+ -]+" required value="${esc(auth?.phone||db.user.phone||'')}" placeholder="${auth?.phone?'':'Tambahkan nomor telepon'}"></label><button class="btn full">Simpan profil</button></form></div><div class="card"><h3>Password akun</h3><p class="sub">Password asli tidak ditampilkan karena disimpan dengan aman sebagai hash di database. Gunakan formulir berikut untuk mengubah password.</p><form id="fPassword" class="fg" style="margin:0"><label class="full">Password saat ini<input name="current_password" type="password" required autocomplete="current-password"></label><label>Password baru<input name="new_password" type="password" minlength="6" required autocomplete="new-password"></label><label>Konfirmasi password baru<input name="password_confirmation" type="password" minlength="6" required autocomplete="new-password"></label><button class="btn full">Ubah password</button></form></div><div class="card"><b>Data demo</b><p class="sub">Semua data tersimpan di browser ini. Atur ulang untuk kembali ke data awal.</p><button class="ghost" data-act="reset">Atur ulang data demo</button></div><div class="card account-logout"><b>Sesi akun</b><p class="sub">Keluar dari akun dan kembali ke halaman login.</p><button class="ghost" data-act="logout">Logout</button></div>`;
  $('#fP').onsubmit=async e=>{
   e.preventDefault();
   try{
    const f=e.target.elements;
    const result=await authRequest('update-profile',{name:f.n.value,email:f.e.value,phone:f.phone.value});
    auth={role:result.user.role,name:result.user.name,email:result.user.email,phone:result.user.phone||''};
    sessionStorage.setItem('nusaAuth',JSON.stringify(auth));syncAuthenticatedUser();renderAcc();toast(result.message);
   }catch(error){toast(error.message)}
  }
  $('#fPassword').onsubmit=async e=>{
   e.preventDefault();
   try{
    const f=e.target.elements;
    const result=await authRequest('change-password',{current_password:f.current_password.value,new_password:f.new_password.value,password_confirmation:f.password_confirmation.value});
    e.target.reset();toast(result.message);
   }catch(error){toast(error.message)}
  }
 }
}
 async function loadDatabaseBookings(){
  try{
   const result=await dataRequest('list-bookings');
   result.bookings.forEach(b=>{
    const packageMatch=db.pkg.find(p=>p.name===b.package_name);
    b.pkg=packageMatch?.id||'';
    const local=db.book.find(x=>x.id===b.id);
    if(local)Object.assign(local,b);else db.book.unshift(b);
   });
   save();if(view==='akun')renderAcc();
  }catch(error){console.error(error)}
 }
 function stars(){$('#stars').innerHTML=[1,2,3,4,5].map(i=>`<button type="button" class="${i<=rate?'on':''}" data-act="star" data-v="${i}" aria-label="${i} bintang">★</button>`).join('')}

/* ---------- Admin ---------- */
const AT=[['sum','▦','Ringkasan'],['dest','◫','Destinasi'],['pkg','▣','Paket wisata'],['book','▤','Pemesanan'],['usr','☺','Pengguna'],['lap','▥','Laporan']];
const jt=v=>'Rp '+(v/1e6).toFixed(1).replace('.',',')+' jt';
function chart(){const t=db.trend.slice();t[6]+=paid().reduce((s,b)=>s+b.total,0)/1e6;
 const W=700,H=260,L=40,max=Math.max(160,Math.ceil(Math.max(...t)/40)*40),x=i=>L+i*(W-L-10)/6,y=v=>H-30-v/max*(H-40);
 const d=t.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('');let g='';
 for(let v=0;v<=max;v+=40)g+=`<line x1="${L}" x2="${W-10}" y1="${y(v)}" y2="${y(v)}" stroke="#e4dfd3"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${v}</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik tren pendapatan Januari sampai Juli">${g}<path d="${d}L${x(6)} ${y(0)}L${x(0)} ${y(0)}Z" fill="#ea5f3820"/><path d="${d}" fill="none" stroke="#ea5f38" stroke-width="3"/>${['Jan','Feb','Mar','Apr','Mei','Jun','Jul'].map((m,i)=>`<text x="${x(i)}" y="${H-8}" text-anchor="middle">${m}</text>`).join('')}</svg>`}
const tbl=(h,r)=>`<div class="tw"><table class="tbl"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${r.join('')||`<tr><td colspan="${h.length}" style="text-align:center;color:var(--mut)">Belum ada data.</td></tr>`}</tbody></table></div>`;
const hb=(t,btn)=>`<div class="hbar"><h2>${t}</h2>${btn||''}</div>`;
function renderAdm(){
 const h=lt().getHours(),adminName=auth?.name||'Admin Nusa',adminInitials=ini(adminName);
 $('#greet').textContent=`Selamat ${h<11?'pagi':h<15?'siang':h<18?'sore':'malam'}, ${adminName}`;
 $('#today').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 $('#av2').textContent=adminInitials;
 $('#admNav').innerHTML=AT.map(a=>`<button class="${a[0]===atab?'on':''}" data-act="atab" data-v="${a[0]}"><span aria-hidden="true">${a[1]}</span>${a[2]}</button>`).join('');
 const el=$('#admBody'),rev=paid().reduce((s,b)=>s+b.total,0);let o='';
 if(atab==='sum'){const top=db.dest.map(d=>({n:d.name,v:d.visits+db.book.filter(b=>b.status!=='Dibatalkan'&&P(b.pkg)?.dest===d.id).reduce((s,b)=>s+b.guests,0)})).sort((a,b)=>b.v-a.v).slice(0,5),mx=Math.max(1,...top.map(t=>t.v));
  o=hb('Bisnis hari ini',`<button class="btn dk" data-act="addpkg">Tambah paket</button>`)+`<div class="stats"><div class="stat"><span>Pendapatan bulan ini</span><b>${jt(db.trend[6]*1e6+rev)}</b></div><div class="stat"><span>Total pemesanan</span><b>${(286+db.book.length).toLocaleString('id-ID')}</b></div><div class="stat"><span>Wisatawan aktif</span><b>${(1248+db.book.reduce((s,b)=>s+b.guests,0)).toLocaleString('id-ID')}</b></div><div class="stat"><span>Menunggu pembayaran</span><b>${db.book.filter(b=>b.status===STAT[0]).length}</b></div></div><div class="two"><div class="panel"><h3>Tren pendapatan</h3><small>Januari – Juli, dalam juta rupiah (data historis demo + pesanan baru)</small>${chart()}</div><div class="panel"><h3>Destinasi terfavorit</h3><small>Berdasarkan total pengunjung</small>${top.map(t=>`<div class="bar"><span>${esc(t.n)}</span><i style="width:${t.v/mx*100}%"></i></div>`).join('')}</div></div>`}
 if(atab==='dest')o=hb('Destinasi',`<button class="btn dk" data-act="adddest">Tambah destinasi</button>`)+tbl(['','Nama','Wilayah','Kategori','Rating',''],db.dest.map(d=>`<tr><td><img src="${esc(d.img)}" alt=""></td><td><b>${esc(d.name)}</b></td><td>${esc(d.region)}</td><td>${esc(d.cat)}</td><td>★ ${d.rating}</td><td><button class="lk" data-act="editdest" data-id="${d.id}">Ubah</button><button class="lk r" data-act="deldest" data-id="${d.id}">Hapus</button></td></tr>`));
 if(atab==='pkg')o=hb('Paket wisata',`<button class="btn dk" data-act="addpkg">Tambah paket</button>`)+tbl(['','Paket','Destinasi','Durasi','Kuota','Harga/pax',''],db.pkg.map(p=>`<tr><td><img src="${esc(pimg(p))}" alt=""></td><td><b>${esc(p.name)}</b></td><td>${esc(D(p.dest)?.name||'-')}</td><td>${esc(p.dur)}</td><td>${p.max}</td><td>${rp(p.price)}</td><td><button class="lk" data-act="editpkg" data-id="${p.id}">Ubah</button><button class="lk r" data-act="delpkg" data-id="${p.id}">Hapus</button></td></tr>`));
 if(atab==='book')o=hb('Pemesanan')+tbl(['Kode','Pemesan','Paket','Berangkat','Peserta','Total','Status',''],db.book.map(b=>`<tr><td>${b.id}</td><td>${esc(b.name)}<br><small>${esc(b.email)}</small></td><td>${esc(P(b.pkg)?.name||'-')}</td><td>${fd(b.date)}</td><td>${b.guests}</td><td>${rp(b.total)}</td><td><select data-act="status" data-id="${b.id}" aria-label="Status ${b.id}">${STAT.map(s=>`<option ${s===b.status?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="lk r" data-act="delbook" data-id="${b.id}">Hapus</button></td></tr>`));
 if(atab==='usr'){const m={};db.book.forEach(b=>{const u=m[b.email]||(m[b.email]={n:b.name,e:b.email,c:0,t:0});u.c++;if(['Pembayaran berhasil','Selesai'].includes(b.status))u.t+=b.total});o=hb('Pengguna')+tbl(['Nama','Email','Pemesanan','Total belanja'],Object.values(m).map(u=>`<tr><td><b>${esc(u.n)}</b></td><td>${esc(u.e)}</td><td>${u.c}</td><td>${rp(u.t)}</td></tr>`))}
 if(atab==='lap')o=hb('Laporan')+`<div class="panel"><h3>Laporan pemesanan</h3><p class="sub">${db.book.length} pemesanan · pendapatan terkonfirmasi ${rp(rev)}. Unduh dalam format CSV untuk dibuka di Excel atau Google Sheets.</p><button class="btn dk" data-act="csv">Unduh laporan (CSV)</button></div>`;
 el.innerHTML=o}
function form(t,fields,vals,ok){
 modal(`<h2>${t}</h2><form id="fx" class="fg">${fields.map(f=>`<label class="${f.full?'full':''}">${f.l}${f.t==='select'?`<select name="${f.n}">${f.o.map(o=>`<option value="${o[0]}" ${o[0]==vals[f.n]?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`:f.t==='area'?`<textarea name="${f.n}" rows="2">${esc(vals[f.n])}</textarea>`:`<input name="${f.n}" type="${f.t||'text'}" ${f.t==='number'?'min="0" step="any"':''} value="${esc(vals[f.n])}" ${f.r===0?'':'required'}>`}</label>`).join('')}<button class="btn full">Simpan</button></form>`);
 $('#fx').onsubmit=async e=>{
  e.preventDefault();const o={};
  fields.forEach(f=>{const v=e.target.elements[f.n].value.trim();o[f.n]=f.t==='number'?+v:v});
  try{await ok(o);save();closeModal();renderAdm();toast('Perubahan disimpan')}catch(error){toast(error.message||'Gagal menyimpan data')}
 }}
const DF=[{n:'name',l:'Nama destinasi'},{n:'region',l:'Wilayah'},{n:'cat',l:'Kategori',t:'select',o:['Bahari','Budaya','Alam'].map(x=>[x,x])},{n:'rating',l:'Rating (0–5)',t:'number'},{n:'img',l:'URL gambar',full:1,t:'url'},{n:'desc',l:'Deskripsi singkat',t:'area',full:1}];
const PF=()=>[{n:'name',l:'Nama paket',full:1},{n:'dest',l:'Destinasi',t:'select',o:db.dest.map(d=>[d.id,d.name])},{n:'dur',l:'Durasi (mis. 3H 2M)'},{n:'max',l:'Maks. tamu',t:'number'},{n:'price',l:'Harga per orang (Rp)',t:'number'},{n:'tag',l:'Label'},{n:'img',l:'URL gambar (opsional)',full:1,r:0},{n:'desc',l:'Deskripsi',t:'area',full:1}];
function csv(){const r=[['Kode','Nama','Email','Paket','Tanggal','Peserta','Total','Status']].concat(db.book.map(b=>[b.id,b.name,b.email,P(b.pkg)?.name||'',b.date,b.guests,b.total,b.status]));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+r.map(x=>x.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}));a.download='laporan-nusa.csv';a.click();toast('Laporan diunduh')}
function qr(c){let h=0;for(const ch of c)h=(h*31+ch.charCodeAt(0))>>>0;let s='';for(let i=0;i<81;i++){h=(h*1103515245+12345)>>>0;const x=i%9,y=Math.floor(i/9),e=(x<3&&y<3)||(x>5&&y<3)||(x<3&&y>5);if(e||h>>>16&1)s+=`<rect x="${x*10}" y="${y*10}" width="10" height="10"/>`}return `<svg viewBox="0 0 90 90" fill="#143a2e" aria-label="Kode QR ${c}">${s}</svg>`}

/* ---------- Event ---------- */
const A={
 go:e=>go(e.v),logout:()=>logout(),menu:()=>$('#nav').classList.toggle('open'),close:closeModal,
 sec:e=>{if(view!=='home')go('home');setTimeout(()=>document.getElementById(e.v).scrollIntoView(),30)},
 cat:e=>{cat=e.v;$('#sCat').value=cat==='Favorit'?'Semua':cat;renderDest()},
 fav:e=>{const i=db.fav.indexOf(e.id);i<0?db.fav.push(e.id):db.fav.splice(i,1);save();renderDest();toast(i<0?'Ditambahkan ke favorit':'Dihapus dari favorit')},
 bookdest:e=>{const p=db.pkg.find(p=>p.dest===e.id);p?openBook(p.id):toast('Belum ada paket untuk destinasi ini')},
 book:e=>openBook(e.id),tab:e=>{tab=e.v;renderAcc()},star:e=>{rate=+e.v;stars()},
 pay:e=>{const b=B(e.id);modal(`<h2>Pembayaran</h2><p class="sub">${b.id} · total <b>${rp(b.total)}</b></p><form id="fPay" class="fg"><label class="full">Metode<select name="method"><option>Transfer bank</option><option>QRIS</option><option>E-wallet</option></select></label><p class="sub full">Ini simulasi. Tidak ada uang yang dipindahkan.</p><button class="btn full">Konfirmasi pembayaran</button></form>`);
  $('#fPay').onsubmit=async ev=>{
   ev.preventDefault();
   try{
    const method=ev.target.elements.method.value;
    await dataRequest('update-booking-status',{booking_code:b.id,status:'Pembayaran berhasil',method});
    b.status='Pembayaran berhasil';save();closeModal();await loadDatabaseBookings();renderAcc();toast('Pembayaran berhasil. E-tiket sudah tersedia.');
   }catch(error){toast(error.message)}
  }},
 cancel:e=>{if(confirm('Batalkan pemesanan ini?')){B(e.id).status=STAT[3];save();renderAcc();toast('Pemesanan dibatalkan')}},
 ticket:e=>{const b=B(e.id);modal(`<h2>E-tiket</h2><div class="ticket"><div><p class="sub">${b.id}</p><p><b>${esc(P(b.pkg)?.name||'')}</b></p><p>${esc(b.name)} · ${b.guests} peserta</p><p>${fd(b.date)}</p></div>${qr(b.id)}</div><p class="sub">Tunjukkan kode ini kepada pemandu saat keberangkatan.</p>`)},
 detail:e=>{const b=B(e.id),p=P(b.pkg)||{},d=D(p.dest)||{};modal(`<h2>${esc(p.name||'Paket dihapus')}</h2><p class="sub">${esc(d.name||'')} ${d.region?'· '+esc(d.region):''}</p><p>${esc(p.desc||'')}</p><div class="sum">Kode: ${b.id}<br>Berangkat: ${fd(b.date)} · Durasi ${esc(p.dur||'-')}<br>Peserta: ${b.guests} × ${rp(p.price||0)}<br>Total: <b>${rp(b.total)}</b><br>Status: ${b.status}${b.notes?'<br>Catatan: '+esc(b.notes):''}</div>`)},
 reset:()=>{if(confirm('Semua data demo akan dikembalikan ke awal. Lanjutkan?')){db=seed();save();renderAcc();toast('Data demo diatur ulang')}},
 atab:e=>{atab=e.v;renderAdm()},csv,
 adddest:()=>form('Tambah destinasi',DF,{cat:'Bahari',rating:4.5},async o=>{
  const result=await dataRequest('add-destination',o);
  db.dest.push({id:'d'+result.destination.id,...result.destination});save();
 }),
 editdest:e=>{const d=D(e.id);form('Ubah destinasi',DF,d,o=>Object.assign(d,o))},
 deldest:e=>{if(db.pkg.some(p=>p.dest===e.id))return toast('Hapus dulu paket yang memakai destinasi ini');if(confirm('Hapus destinasi ini?')){db.dest=db.dest.filter(d=>d.id!==e.id);db.fav=db.fav.filter(i=>i!==e.id);save();renderAdm()}},
 addpkg:()=>{if(!db.dest.length)return toast('Tambah destinasi dulu');atab='pkg';renderAdm();form('Tambah paket',PF(),{max:10,price:1000000},o=>db.pkg.push({id:'p'+Date.now(),...o}))},
 editpkg:e=>{const p=P(e.id);form('Ubah paket',PF(),p,o=>Object.assign(p,o))},
 delpkg:e=>{if(confirm('Hapus paket ini?')){db.pkg=db.pkg.filter(p=>p.id!==e.id);save();renderAdm()}},
 delbook:e=>{if(confirm('Hapus pemesanan ini?')){db.book=db.book.filter(b=>b.id!==e.id);save();renderAdm()}}
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t||t.tagName==='SELECT')return;if(t.tagName==='A')e.preventDefault();A[t.dataset.act]?.(t.dataset)});
document.addEventListener('change',async e=>{
 const t=e.target;
 if(t.dataset.act==='status'){
  try{
   await dataRequest('update-booking-status',{booking_code:t.dataset.id,status:t.value,method:'Transfer bank'});
   B(t.dataset.id).status=t.value;save();await loadDatabaseBookings();renderAdm();toast('Status diperbarui');
  }catch(error){toast(error.message)}
 }
});
$('#modal').addEventListener('mousedown',e=>{if(e.target.id==='modal'&&auth)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&auth)closeModal()});
$('#fSearch').addEventListener('submit',e=>{e.preventDefault();q=$('#sQ').value.trim();cat=$('#sCat').value;selDate=$('#sDate').value;renderDest();document.getElementById('destinasi').scrollIntoView();
 const n=$$('#destGrid .dest').length;toast(n?`${n} destinasi ditemukan`:'Tidak ada destinasi yang cocok')});
$('#yr').textContent=new Date().getFullYear();
applyRole();
async function restoreDatabaseSession(){
 try{
  const response=await fetch(`${AUTH_API}?action=session`,{credentials:'same-origin'});
  const result=await response.json();
  if(result.success&&result.user){
   auth={role:result.user.role,name:result.user.name,email:result.user.email,phone:result.user.phone||''};
   sessionStorage.setItem('nusaAuth',JSON.stringify(auth));syncAuthenticatedUser();
   await loadDatabaseDestinations();
   if(auth.role==='admin')go('admin');
   else go('home');
   return;
  }
 }catch{}
 auth=null;sessionStorage.removeItem('nusaAuth');applyRole();openLogin();
}
restoreDatabaseSession();
