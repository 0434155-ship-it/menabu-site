const theme=new URLSearchParams(location.search).get('theme')||location.hash.replace('#design-','');
if(['light','craft','graphite'].includes(theme))document.documentElement.dataset.theme=theme;
document.querySelectorAll('.designs [data-theme]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.theme===document.documentElement.dataset.theme));b.onclick=()=>{document.documentElement.dataset.theme=b.dataset.theme;document.querySelectorAll('.designs [data-theme]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}});
document.getElementById('notes').onclick=()=>alert('Отдельная оптовая страница. Демонстрация — данные никуда не отправляются.');
document.getElementById('businessForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);document.getElementById('businessResult').textContent='Черновик заявки\n'+f.get('name')+'\n'+f.get('company')+'\n'+f.get('phone')+'\n'+f.get('message')+'\n\nЗаявка не отправлена.';};
