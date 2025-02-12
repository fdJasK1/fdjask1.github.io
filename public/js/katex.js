document.addEventListener("DOMContentLoaded", function () {
    if (document.querySelector('.katex')) {
      return;
    }
    var katexScript = document.createElement("script");
    katexScript.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.4/katex.min.js";
    katexScript.defer = true;
    document.head.appendChild(katexScript);
  });
  