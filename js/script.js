// Sticky Navbar
window.addEventListener("scroll", function() {
    const header = document.getElementById("header");
    header.classList.toggle("sticky", window.scrollY > 50);
  });
  
  // Loader
  window.addEventListener("load", function() {
    const loader = document.getElementById("loader");
    loader.classList.add("fade-out");
  });
  
  // Sayfa yüklendikten sonra loader'ı kaldır
window.addEventListener("load", function() {
    const loader = document.getElementById("loader");
    loader.classList.add("fade-out");
    
    setTimeout(function() {
        loader.style.display = "none"; // Yükleme animasyonunu gizler
    }, 1500); // Animasyon bitiminden sonra gizler
});