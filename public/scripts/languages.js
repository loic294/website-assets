const pickers = document.getElementsByClassName('language-picker-content');

for (const picker of pickers) {
    const secondChild = picker.childNodes[1];
    if (secondChild) {
        secondChild.href = 'https://loicbellemarealford.ca';
    }
}