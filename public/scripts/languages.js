document.addEventListener('DOMContentLoaded', function() {
    Weglot.on("languageChanged", function(newLang, prevLang) {
        console.log("The language on the page just changed to (code): " + newLang)
        console.log("The full name of the language is: " + Weglot.getLanguageName(newLang))
    })
});