// yuzh-charcount/script.js : ページメニューに文字数と行数を出す（basyomemos から移植）
scrapbox.PageMenu.addItem({
  title: () => {
    const lines = scrapbox.Page.lines;
    if (!lines || lines.length === 0) return '';
    const chars = lines.reduce((a, l) => a + l.text.length, 0);
    return `${chars}文字 ${lines.length}行`;
  },
  onClick: () => null,
});
