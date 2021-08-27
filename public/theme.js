ThemeHandler = function (name) {
    document.getElementById("link").setAttribute("href", "watch.html?theme=" + name)
}

HighlightHandler = function(identifier) {
    let borders = document.querySelectorAll(".image-border");
    for(let element of borders) {
        console.log("removing active " + element.classList)
        element.classList.remove("active");
    }
    document.querySelector(identifier).classList.add("active");
    console.log("adding active "+ document.querySelector(identifier).classList)
}
