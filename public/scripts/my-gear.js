if (window.location.pathname.includes('/my-gear/category/')) {
  const category = window.location.pathname.replace('/my-gear/category/', '').replaceAll('+', ' ');
  const elem = document.getElementById('cateogry-title');
  elem.style.display = 'block';
  elem.innerText = decodeURI(category);
} 
