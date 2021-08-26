ThemeHandler = function (name) {
    document.getElementById("link").setAttribute("href", "watch.html?theme=" + name)
    document.getElementById("link").style.display="block";
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("link").style.display = "none";
});