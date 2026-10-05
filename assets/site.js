const button=document.querySelector('.menu-button');
const links=document.querySelector('.nav-links');
if(button&&links){
  if(!links.querySelector('a[href="/resume/"]')){
    const resume=document.createElement('a'); resume.href='/resume/'; resume.textContent='Résumé';
    const contact=links.querySelector('a[href="/contact/"]'); links.insertBefore(resume,contact||null);
  }
  button.addEventListener('click',()=>{const open=links.classList.toggle('open');button.setAttribute('aria-expanded',String(open));});
  links.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{links.classList.remove('open');button.setAttribute('aria-expanded','false');}));
}
const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.12}):null;
document.querySelectorAll('.reveal').forEach(item=>{if(observer)observer.observe(item);else item.classList.add('visible');});
document.querySelectorAll('[data-year]').forEach(item=>{item.textContent=new Date().getFullYear();});
