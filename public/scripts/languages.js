const pickers = document.getElementsByClassName('language-picker-content');

console.log('PICKERS', pickers);

for (const picker of pickers) {
    console.log('Pick', picker.childNodes, picker.childNodes[1].firstChild)
    const aElem = picker.childNodes[1].firstChild;
    if (aElem) {
        aElem.href = 'https://loicbellemarealford.ca';
    }
}