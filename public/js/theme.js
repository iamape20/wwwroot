/*
==========================================================
 Elite Power Ratings
 File : js/theme.js
 Version : 1.0.0

 Wires up the dark/light toggle button. The actual THEME
 APPLICATION (reading localStorage, falling back to
 prefers-color-scheme, setting data-theme on <html>) happens
 in the small inline script at the top of index.html's <head>,
 not here - that has to run before first paint to avoid a
 flash of the wrong theme, which a deferred external script
 like this one can't guarantee. This file only needs to run
 once the button itself exists in the DOM.
==========================================================
*/

(function () {

    var STORAGE_KEY = "epr-theme";
    var root = document.documentElement;
    var button = document.getElementById("theme-toggle");

    if (!button) return;

    function currentTheme() {
        return root.getAttribute("data-theme") === "light" ? "light" : "dark";
    }

    function reflectButton(theme) {
        var goingToLight = theme === "dark"; // clicking shows what you'd switch TO
        button.textContent = theme === "light" ? "☀️" : "🌙";
        button.setAttribute(
            "aria-label",
            goingToLight ? "Switch to light theme" : "Switch to dark theme"
        );
    }

    reflectButton(currentTheme());

    button.addEventListener("click", function () {

        var next = currentTheme() === "light" ? "dark" : "light";

        root.setAttribute("data-theme", next);
        reflectButton(next);

        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (e) {
            // Private browsing / storage disabled - theme still
            // applies for this page view, just won't persist.
        }

    });

})();
