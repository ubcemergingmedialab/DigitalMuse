window.addEventListener("DOMContentLoaded", () => {
    let url_string = window.location.href
    let url = new URL(url_string);
    let theme = url.searchParams.get("theme");
    document.getElementById("link").setAttribute("href", document.getElementById("link").getAttribute("href") + "?theme=" + theme)
});