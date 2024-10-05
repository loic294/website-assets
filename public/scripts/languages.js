const pickers = document.getElementsByClassName('language-picker-content');

for (const picker of pickers) {
    const aElem = picker.childNodes[1].firstChild;
    if (aElem) {
        aElem.href = 'https://loicbellemarealford.ca';
    }
}